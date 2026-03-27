import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import cron from "node-cron";
import { prisma } from "../../shared/db/prisma";
import { evaluateWorkflows } from "../automation/automation.engine";
import { notify } from "../notifier/notifier.service";
import { runSlaEscalationScan } from "../complaints/complaints.sla";
import { ComplaintStatus } from "@prisma/client";

const slaCronPlugin: FastifyPluginAsync = async (fastify) => {
  if (process.env.NODE_ENV === "test") {
    fastify.log.info("sla-cron: skipped in test environment");
    return;
  }

  cron.schedule("*/5 * * * *", async () => {
    fastify.log.info("sla-cron: starting workflow evaluation");

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
            await prisma.complaint.update({
              where: { id: action.complaintId },
              data: { status: ComplaintStatus.CLOSED },
            });
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
            fastify.log.info(
              { complaintId: action.complaintId },
              "sla-cron: complaint auto-closed"
            );
            break;
          }

          case "auto_resolve": {
            await prisma.complaint.update({
              where: { id: action.complaintId },
              data: {
                status: ComplaintStatus.RESOLVED,
                resolvedAt: new Date(),
                resolvedBy: "system",
              },
            });
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
  });
};

export default fp(slaCronPlugin);
