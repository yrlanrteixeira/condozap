import { PrismaClient } from "@prisma/client";
import { findActiveByCondominiumId } from "./announcements.repository";

/**
 * List announcements active in the current week (or overlapping with now) for a condominium.
 * Moradores and admins with access to the condominium can read.
 */
export async function findActiveByCondominium(
  prisma: PrismaClient,
  condominiumId: string
) {
  const now = new Date();
  const announcements = await findActiveByCondominiumId(prisma, condominiumId, now);

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
