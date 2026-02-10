import { PrismaClient } from "@prisma/client";

/**
 * List announcements active in the current week (or overlapping with now) for a condominium.
 * Moradores and admins with access to the condominium can read.
 */
export async function findActiveByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      condominiumId,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "desc" },
  });

  return announcements.map((a) => ({
    id: a.id,
    condominiumId: a.condominiumId,
    title: a.title,
    content: a.content,
    imageUrl: a.imageUrl,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    createdBy: a.createdBy,
  }));
}
