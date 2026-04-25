import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import cron from "node-cron";
import { prisma } from "../../shared/db/prisma";
import { evaluateWorkflows } from "../automation/automation.engine";
import { notify } from "../notifier/notifier.service";
import { runSlaEscalationScan } from "../complaints/complaints.sla";
import { ComplaintStatus } from "@prisma/client";
import { whatsappService } from "../whatsapp/whatsapp.service";
import { toWhatsAppDigits } from "../../shared/utils/phone";
import {
  ADVISORY_LOCK_KEYS,
  withAdvisoryLock,
} from "../../shared/db/advisory-lock";

type CronLogger = {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

const slaCronPlugin: FastifyPluginAsync = async (fastify) => {
  if (process.env.NODE_ENV === "test") {
    fastify.log.info("sla-cron: skipped in test environment");
    return;
  }

  cron.schedule("*/5 * * * *", async () => {
    // Cross-process safety: a Postgres advisory lock prevents two app
    // instances (or a slow previous run on the same instance) from
    // overlapping. If the lock is already held, skip silently.
    const ran = await withAdvisoryLock(
      prisma,
      ADVISORY_LOCK_KEYS.SLA_CRON,
      async () => {
        fastify.log.info("sla-cron: starting workflow evaluation");
        await runSlaCronTick(fastify.log as unknown as CronLogger);
        return true;
      }
    );
    if (ran === null) {
      fastify.log.warn(
        "sla-cron: skipped — another process holds the advisory lock"
      );
    }
  });

  // Daily account expiration check at midnight.
  cron.schedule("0 0 * * *", async () => {
    fastify.log.info("[AccountExpiration] Running daily expiration check");
    try {
      await runAccountExpirationTick(fastify.log as unknown as CronLogger);
    } catch (error) {
      fastify.log.error(error, "[AccountExpiration] Failed to process expirations");
    }
  });
};

/**
 * Daily expiration tick — exported so integration tests can drive it
 * directly without waiting on cron schedules. The flow:
 *   1) snapshot users about to be suspended (need ids + condo memberships)
 *   2) flip their status to SUSPENDED
 *   3) emit one in-app notification to each suspended user AND to every
 *      síndico of every condo they belong to so the management side can
 *      react (renew, contact, etc.)
 * Notifications are best-effort: failures do not roll back the suspension.
 */
export async function runAccountExpirationTick(
  logger: CronLogger
): Promise<{ suspendedCount: number; notificationsCreated: number }> {
  const expiringUsers = await prisma.user.findMany({
    where: {
      accountExpiresAt: { lte: new Date() },
      status: "APPROVED",
    },
    select: {
      id: true,
      name: true,
      condominiums: {
        select: {
          condominiumId: true,
          condominium: { select: { name: true } },
        },
      },
    },
  });

  if (expiringUsers.length === 0) return { suspendedCount: 0, notificationsCreated: 0 };

  const userIds = expiringUsers.map((u) => u.id);
  const result = await prisma.user.updateMany({
    where: { id: { in: userIds }, status: "APPROVED" },
    data: { status: "SUSPENDED" },
  });

  // Resolve all the syndics for the affected condos in a single round-trip.
  const condoIds = [
    ...new Set(expiringUsers.flatMap((u) => u.condominiums.map((c) => c.condominiumId))),
  ];
  const syndicLinks = condoIds.length
    ? await prisma.userCondominium.findMany({
        where: {
          condominiumId: { in: condoIds },
          role: { in: ["SYNDIC", "PROFESSIONAL_SYNDIC"] },
        },
        select: { condominiumId: true, userId: true },
      })
    : [];
  const syndicsByCondo = new Map<string, string[]>();
  for (const link of syndicLinks) {
    const arr = syndicsByCondo.get(link.condominiumId) ?? [];
    arr.push(link.userId);
    syndicsByCondo.set(link.condominiumId, arr);
  }

  let notificationsCreated = 0;
  for (const u of expiringUsers) {
    try {
      await prisma.notification.create({
        data: {
          userId: u.id,
          type: "ACCOUNT_SUSPENDED",
          title: "Conta suspensa",
          body: "Sua conta foi suspensa por expiração. Procure o síndico para reativar.",
          data: { reason: "account_expired" } as any,
        },
      });
      notificationsCreated += 1;

      // Notify each syndic for each condo this user belonged to.
      const syndicIds = new Set<string>();
      for (const c of u.condominiums) {
        for (const sid of syndicsByCondo.get(c.condominiumId) ?? []) {
          if (sid !== u.id) syndicIds.add(sid);
        }
      }
      for (const syndicId of syndicIds) {
        await prisma.notification
          .create({
            data: {
              userId: syndicId,
              type: "MEMBER_ACCOUNT_SUSPENDED",
              title: "Membro suspenso por expiração",
              body: `${u.name} teve a conta suspensa automaticamente.`,
              data: { suspendedUserId: u.id } as any,
            },
          })
          .then(() => {
            notificationsCreated += 1;
          })
          .catch((err) => {
            logger.error(
              { err, syndicId, expiredUserId: u.id },
              "[AccountExpiration] failed to notify syndic"
            );
          });
      }
    } catch (err) {
      logger.error(
        { err, userId: u.id },
        "[AccountExpiration] failed to create suspension notification"
      );
    }
  }

  if (result.count > 0) {
    logger.info(
      `[AccountExpiration] Suspended ${result.count} expired accounts (${notificationsCreated} notifications)`
    );
  }
  return { suspendedCount: result.count, notificationsCreated };
}

/**
 * Body of the SLA cron tick — extracted so that it (and the lock helper)
 * can be exercised independently in unit tests.
 */
export async function runSlaCronTick(logger: CronLogger): Promise<void> {
  let actions;
  try {
    actions = await evaluateWorkflows(prisma);
  } catch (err) {
    logger.error({ err }, "sla-cron: failed to evaluate workflows");
    return;
  }

  logger.info(
    { count: actions.length },
    "sla-cron: workflow actions to process"
  );

  for (const action of actions) {
    try {
      switch (action.type) {
        case "auto_close": {
          const autoCloseResult = await prisma.complaint.updateMany({
            where: { id: action.complaintId, status: ComplaintStatus.RESOLVED },
            data: { status: ComplaintStatus.CLOSED, closedAt: new Date() },
          });
          if (autoCloseResult.count > 0) {
            await prisma.complaintStatusHistory.create({
              data: {
                complaintId: action.complaintId,
                fromStatus: ComplaintStatus.RESOLVED,
                toStatus: ComplaintStatus.CLOSED,
                changedBy: "system",
                notes: action.reason,
                action: "AUTO_CLOSE",
              },
            });

            const complaint = await prisma.complaint.findUnique({
              where: { id: action.complaintId },
              include: {
                resident: true,
                condominium: { select: { reopenDeadlineDays: true } },
              },
            });
            if (complaint?.resident.consentWhatsapp) {
              whatsappService
                .sendTextMessage(
                  toWhatsAppDigits(complaint.resident.phone),
                  `Sua ocorrência #${action.complaintId} foi encerrada automaticamente. Caso necessário, você pode reabri-la em até ${complaint.condominium.reopenDeadlineDays} dias.`
                )
                .catch(() => {});
            }

            logger.info(
              { complaintId: action.complaintId },
              "sla-cron: complaint auto-closed"
            );
          } else {
            logger.warn(
              { complaintId: action.complaintId },
              "sla-cron: auto_close skipped — complaint no longer in RESOLVED status"
            );
          }
          break;
        }

        case "auto_resolve": {
          const autoResolveResult = await prisma.complaint.updateMany({
            where: { id: action.complaintId, status: ComplaintStatus.WAITING_USER },
            data: {
              status: ComplaintStatus.RESOLVED,
              resolvedAt: new Date(),
              resolvedBy: "system",
            },
          });
          if (autoResolveResult.count > 0) {
            await prisma.complaintStatusHistory.create({
              data: {
                complaintId: action.complaintId,
                fromStatus: ComplaintStatus.WAITING_USER,
                toStatus: ComplaintStatus.RESOLVED,
                changedBy: "system",
                notes: action.reason,
                action: "AUTO_RESOLVE",
              },
            });
            logger.info(
              { complaintId: action.complaintId },
              "sla-cron: complaint auto-resolved"
            );
          } else {
            logger.warn(
              { complaintId: action.complaintId },
              "sla-cron: auto_resolve skipped — complaint no longer in WAITING_USER status"
            );
          }
          break;
        }

        case "send_reminder": {
          const complaint = await prisma.complaint.findUnique({
            where: { id: action.complaintId },
            include: {
              condominium: {
                include: {
                  users: {
                    where: { role: { in: ["SYNDIC", "PROFESSIONAL_SYNDIC"] } },
                    include: { user: { include: { resident: true } } },
                    take: 1,
                  },
                },
              },
            },
          });

          if (!complaint) {
            logger.warn(
              { complaintId: action.complaintId },
              "sla-cron: complaint not found for send_reminder"
            );
            break;
          }

          const syndicRecord = complaint.condominium.users[0];
          if (!syndicRecord) {
            logger.warn(
              { complaintId: action.complaintId },
              "sla-cron: no syndic found for send_reminder"
            );
            break;
          }

          const syndicUser = syndicRecord.user;
          const syndicPhone =
            syndicUser.resident?.phone ?? syndicUser.requestedPhone ?? "";
          const minutesRemaining =
            typeof action.payload.minutesRemaining === "number"
              ? action.payload.minutesRemaining
              : 0;
          const slaType =
            action.payload.slaType === "resolution" ? "resolution" : "response";

          await notify(
            prisma,
            logger as any,
            {
              type: "sla_warning",
              complaintId: action.complaintId,
              syndicPhone,
              syndicName: syndicUser.name,
              minutesRemaining,
              slaType,
            },
            syndicUser.id,
            complaint.condominiumId
          );

          logger.info(
            { complaintId: action.complaintId, syndicId: syndicUser.id },
            "sla-cron: sla_warning notification sent"
          );
          break;
        }

        case "escalate": {
          await runSlaEscalationScan(prisma, logger as any);
          logger.info(
            { complaintId: action.complaintId },
            "sla-cron: escalation scan triggered"
          );
          break;
        }

        default:
          logger.warn(
            { action },
            "sla-cron: unknown workflow action type"
          );
      }
    } catch (err) {
      logger.error(
        { err, action },
        "sla-cron: error processing workflow action"
      );
    }
  }

  logger.info("sla-cron: workflow evaluation complete");
}

export default fp(slaCronPlugin);
