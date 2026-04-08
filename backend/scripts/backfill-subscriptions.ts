import { UserRole, SubscriptionStatus } from "@prisma/client";

import { createPrismaClient } from "../src/shared/db/prisma";

const prisma = createPrismaClient();

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function backfillSubscriptions() {
  console.log("[backfill] fetching síndicos...");
  const syndics = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.SYNDIC, UserRole.PROFESSIONAL_SYNDIC] },
    },
    select: { id: true, createdAt: true, name: true },
  });
  console.log(`[backfill] found ${syndics.length} síndicos`);

  let created = 0;
  let skipped = 0;

  for (const syndic of syndics) {
    const existing = await prisma.subscription.findUnique({
      where: { syndicId: syndic.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const now = new Date();
    const trialFromCreation = addDays(syndic.createdAt, 14);
    // If the 14-day window from creation is still in the future, honor it.
    // Otherwise grant a fresh 14-day grace period starting now.
    const trialEndsAt = trialFromCreation > now ? trialFromCreation : addDays(now, 14);

    await prisma.subscription.create({
      data: {
        syndicId: syndic.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
      },
    });
    created++;
    console.log(`[backfill]   created trial for ${syndic.name} (ends ${trialEndsAt.toISOString()})`);
  }

  console.log(`[backfill] subscriptions: ${created} created, ${skipped} already existed`);
}

async function backfillPrimarySyndic() {
  console.log("[backfill] fetching condominiums without primarySyndicId...");
  const condos = await prisma.condominium.findMany({
    where: { primarySyndicId: null },
    select: { id: true, name: true },
  });
  console.log(`[backfill] found ${condos.length} condominiums to backfill`);

  let updated = 0;
  let orphans = 0;

  for (const condo of condos) {
    const link = await prisma.userCondominium.findFirst({
      where: {
        condominiumId: condo.id,
        role: { in: [UserRole.SYNDIC, UserRole.PROFESSIONAL_SYNDIC] },
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });

    if (!link) {
      console.warn(`[backfill]   WARNING: condominium "${condo.name}" (${condo.id}) has no syndic — skipping`);
      orphans++;
      continue;
    }

    await prisma.condominium.update({
      where: { id: condo.id },
      data: { primarySyndicId: link.userId },
    });
    updated++;
  }

  console.log(`[backfill] condominiums: ${updated} updated, ${orphans} orphans (no syndic)`);
}

async function main() {
  await backfillSubscriptions();
  await backfillPrimarySyndic();
  console.log("[backfill] done.");
}

main()
  .catch((err) => {
    console.error("[backfill] error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
