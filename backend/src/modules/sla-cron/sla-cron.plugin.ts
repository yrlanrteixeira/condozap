import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import cron from "node-cron";
import { prisma } from "../../shared/db/prisma";
import { evaluateWorkflows } from "../automation/automation.engine";
import { notify } from "../notifier/notifier.service";
import { runSlaEscalationScan } from "../complaints/complaints.sla";
import { ComplaintStatus } from "@prisma/client";
import { whatsappService } from "../whatsapp/whatsapp.service";

const slaCronPlugin: FastifyPluginAsync = async (fastify) => {
  if (process.env.NODE_ENV === "test") {
    fastify.log.info("sla-cron: skipped in test environment");
    return;
  }

  let isRunning = false;

  cron.schedule("*/5 * * * *", async () => {
    if (isRunning) {
      fastify.log.warn("sla-cron: skipped — previous run still active");
      return;
    }
    isRunning = true;
    fastify.log.info("sla-cron: starting workflow evaluation");

    try {
      let actions;
      try {
        actions = await evaluateWorkflows(prisma);
      } catch (err) {
        fastify.log.error({ err }, "sla-cron: failed to evaluate workflows");
        return;
      }

      fastify.log.info(
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
                  whatsappService.sendTextMessage(
                    complaint.resident.phone,
                    `Sua ocorrência #${action.complaintId} foi encerrada automaticamente. Caso necessário, você pode reabri-la em até ${complaint.condominium.reopenDeadlineDays} dias.`
                  ).catch(() => {});
                }

                fastify.log.info(
                  { complaintId: action.complaintId },
                  "sla-cron: complaint auto-closed"
                );
              } else {
                fastify.log.warn(
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
                fastify.log.info(
                  { complaintId: action.complaintId },
                  "sla-cron: complaint auto-resolved"
                );
              } else {
                fastify.log.warn(
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
                fastify.log.warn(
                  { complaintId: action.complaintId },
                  "sla-cron: complaint not found for send_reminder"
                );
                break;
              }

              const syndicRecord = complaint.condominium.users[0];
              if (!syndicRecord) {
                fastify.log.warn(
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
                fastify.log,
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

              fastify.log.info(
                { complaintId: action.complaintId, syndicId: syndicUser.id },
                "sla-cron: sla_warning notification sent"
              );
              break;
            }

            case "escalate": {
              await runSlaEscalationScan(prisma, fastify.log);
              fastify.log.info(
                { complaintId: action.complaintId },
                "sla-cron: escalation scan triggered"
              );
              break;
            }

            default:
              fastify.log.warn(
                { action },
                "sla-cron: unknown workflow action type"
              );
          }
        } catch (err) {
          fastify.log.error(
            { err, action },
            "sla-cron: error processing workflow action"
          );
        }
      }

      fastify.log.info("sla-cron: workflow evaluation complete");
    } finally {
      isRunning = false;
    }
  });

  // Daily account expiration check at midnight
  cron.schedule("0 0 * * *", async () => {
    fastify.log.info("[AccountExpiration] Running daily expiration check");
    try {
      const result = await prisma.user.updateMany({
        where: {
          accountExpiresAt: { lte: new Date() },
          status: "APPROVED",
        },
        data: { status: "SUSPENDED" },
      });
      if (result.count > 0) {
        fastify.log.info(`[AccountExpiration] Suspended ${result.count} expired accounts`);
      }
    } catch (error) {
      fastify.log.error(error, "[AccountExpiration] Failed to process expirations");
    }
  });
};

export default fp(slaCronPlugin);
