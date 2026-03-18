import { PrismaClient } from "@prisma/client";

export async function findActiveByCondominiumId(
  prisma: PrismaClient,
  condominiumId: string,
  now: Date
) {
  return prisma.announcement.findMany({
    where: {
      condominiumId,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "desc" },
  });
}
