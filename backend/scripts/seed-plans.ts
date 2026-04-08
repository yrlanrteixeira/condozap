import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TIERS = [
  {
    slug: "tier-1",
    displayName: "1 a 3 condomínios",
    minCondominiums: 1,
    maxCondominiums: 3,
    pricePerCondoCents: 80000,
    sortOrder: 1,
  },
  {
    slug: "tier-2",
    displayName: "4 a 7 condomínios",
    minCondominiums: 4,
    maxCondominiums: 7,
    pricePerCondoCents: 70000,
    sortOrder: 2,
  },
  {
    slug: "tier-3",
    displayName: "8 a 15 condomínios",
    minCondominiums: 8,
    maxCondominiums: 15,
    pricePerCondoCents: 60000,
    sortOrder: 3,
  },
  {
    slug: "tier-4",
    displayName: "16 ou mais condomínios",
    minCondominiums: 16,
    maxCondominiums: -1,
    pricePerCondoCents: 50000,
    sortOrder: 4,
  },
];

async function main() {
  console.log("[seed-plans] upserting billing tiers...");

  for (const tier of TIERS) {
    const result = await prisma.plan.upsert({
      where: { slug: tier.slug },
      create: {
        slug: tier.slug,
        displayName: tier.displayName,
        minCondominiums: tier.minCondominiums,
        maxCondominiums: tier.maxCondominiums,
        pricePerCondoCents: tier.pricePerCondoCents,
        setupFeeCents: 200000,
        isActive: true,
        sortOrder: tier.sortOrder,
      },
      update: {
        displayName: tier.displayName,
        minCondominiums: tier.minCondominiums,
        maxCondominiums: tier.maxCondominiums,
        pricePerCondoCents: tier.pricePerCondoCents,
        sortOrder: tier.sortOrder,
      },
    });
    console.log(
      `[seed-plans]   ${result.slug} — R$ ${(result.pricePerCondoCents / 100).toFixed(2)}/condo (${result.minCondominiums}..${result.maxCondominiums === -1 ? "∞" : result.maxCondominiums})`
    );
  }

  console.log("[seed-plans] done.");
}

main()
  .catch((err) => {
    console.error("[seed-plans] error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
