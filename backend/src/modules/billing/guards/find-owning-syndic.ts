import type { FastifyRequest } from "fastify";
import { prisma } from "../../../shared/db/prisma";
import type { AuthUser } from "../../../types/auth";

/**
 * Strategies for determining which syndic "owns" a given HTTP request so the
 * subscription guard can load the right subscription.
 */
export type OwningSyndicStrategy =
  | { kind: "current-user" }
  | { kind: "condo-param"; paramName: string }
  | { kind: "user-link" };

const SYNDIC_ROLES = ["SYNDIC", "PROFESSIONAL_SYNDIC"] as const;

function isSyndicRole(role: string): boolean {
  return (SYNDIC_ROLES as readonly string[]).includes(role);
}

export async function findOwningSyndic(
  request: FastifyRequest,
  strategy: OwningSyndicStrategy,
): Promise<string | null> {
  const user = request.user as AuthUser | undefined;
  if (!user) return null;

  switch (strategy.kind) {
    case "current-user": {
      return isSyndicRole(user.role) ? user.id : null;
    }

    case "condo-param": {
      const params = request.params as Record<string, string | undefined>;
      const condominiumId = params[strategy.paramName];
      if (!condominiumId) return null;
      const condo = await prisma.condominium.findUnique({
        where: { id: condominiumId },
        select: { primarySyndicId: true },
      });
      return condo?.primarySyndicId ?? null;
    }

    case "user-link": {
      // Any condominium the current user belongs to — use the first match.
      // Writes in this category (e.g. a sector member creating a complaint)
      // are billed to that condominium's primary syndic.
      const link = await prisma.userCondominium.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { condominiumId: true },
      });
      if (!link) return null;
      const condo = await prisma.condominium.findUnique({
        where: { id: link.condominiumId },
        select: { primarySyndicId: true },
      });
      return condo?.primarySyndicId ?? null;
    }
  }
}
