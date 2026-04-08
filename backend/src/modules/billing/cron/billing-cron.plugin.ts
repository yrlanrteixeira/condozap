import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import cron from "node-cron";
import { prisma } from "../../../shared/db/prisma";
import { runBillingReminderJob } from "./reminder.job";
import { runBillingEscalateJob } from "./escalate.job";
import { runTrialReminderJob } from "./trial-reminder.job";

const billingCronPlugin: FastifyPluginAsync = async (fastify) => {
  if (process.env.NODE_ENV === "test") {
    fastify.log.info("billing-cron: skipped in test environment");
    return;
  }

  // Daily at 08:00: generate next-cycle bills ~5 days before expiry
  cron.schedule("0 8 * * *", async () => {
    fastify.log.info("billing-cron: reminder job starting");
    try {
      const count = await runBillingReminderJob(prisma, fastify.log);
      fastify.log.info({ count }, "billing-cron: reminder job done");
    } catch (err) {
      fastify.log.error({ err }, "billing-cron: reminder job failed");
    }
  });

  // Daily at 09:00: notify escalations (grace/soft-lock/hard-lock transitions)
  cron.schedule("0 9 * * *", async () => {
    fastify.log.info("billing-cron: escalate job starting");
    try {
      const count = await runBillingEscalateJob(prisma, fastify.log);
      fastify.log.info({ count }, "billing-cron: escalate job done");
    } catch (err) {
      fastify.log.error({ err }, "billing-cron: escalate job failed");
    }
  });

  // Daily at 10:00: trial expiration reminders
  cron.schedule("0 10 * * *", async () => {
    fastify.log.info("billing-cron: trial-reminder job starting");
    try {
      const count = await runTrialReminderJob(prisma, fastify.log);
      fastify.log.info({ count }, "billing-cron: trial-reminder job done");
    } catch (err) {
      fastify.log.error({ err }, "billing-cron: trial-reminder job failed");
    }
  });

  fastify.log.info("billing-cron: schedules registered");
};

export default fp(billingCronPlugin, { name: "billing-cron-plugin" });
