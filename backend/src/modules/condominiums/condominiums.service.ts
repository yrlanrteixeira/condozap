import { PrismaClient, Prisma, UserRole } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors";
import {
  isValidCondominiumSlugFormat,
  normalizeCondominiumSlug,
  slugFromName,
} from "../../shared/utils/condominium-slug";
import type {
  CreateCondominiumRequest,
  UpdateCondominiumRequest,
} from "./condominiums.schema";
import * as repo from "./condominiums.repository";

const SYNDIC_ROLES: UserRole[] = ["SYNDIC", "PROFESSIONAL_SYNDIC"];

async function allocateUniqueCondominiumSlug(
  prisma: PrismaClient,
  base: string
): Promise<string> {
  let candidate = base;
  let n = 0;
  while (await repo.findBySlug(prisma, candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function createCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateCondominiumRequest,
  userId: string
) {
  const existingCondominium = await repo.findByCnpj(prisma, data.cnpj);
  if (existingCondominium) {
    throw new ConflictError("CNPJ já cadastrado");
  }

  // When the caller is a syndic, they automatically become the billing owner
  // (primarySyndicId) so cycle amount calculation can find a matching tier.
  // SUPER_ADMIN created condominiums start with no billing owner and must be
  // assigned to a syndic via the user-management flow before billing kicks in.
  const caller = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const primarySyndicId =
    caller && SYNDIC_ROLES.includes(caller.role) ? userId : undefined;

  const baseSlug = data.slug
    ? normalizeCondominiumSlug(data.slug)
    : slugFromName(data.name);
  if (!isValidCondominiumSlugFormat(baseSlug)) {
    throw new BadRequestError(
      "Slug inválido: use apenas letras minúsculas, números e hífens (2–100 caracteres)."
    );
  }
  const uniqueSlug = await allocateUniqueCondominiumSlug(prisma, baseSlug);

  // Atomic: create the condominium AND its syndic access link in a single
  // transaction so a failed UserCondominium insert does not leave an
  // orphaned condominium pointing at a syndic who cannot reach it.
  const condominium = await prisma.$transaction(async (tx) => {
    const created = await repo.create(tx as PrismaClient, {
      name: data.name,
      slug: uniqueSlug,
      cnpj: data.cnpj,
      whatsappPhone: data.whatsappPhone,
      whatsappBusinessId: data.whatsappBusinessId,
      primarySyndicId,
    });

    if (primarySyndicId && caller) {
      await tx.userCondominium.create({
        data: {
          userId: primarySyndicId,
          condominiumId: created.id,
          role: caller.role,
        },
      });
    }

    // SUPER_ADMIN precisa de vínculo operacional para gerenciar setores, equipe e
    // fluxos do condomínio (requireCondoAccess); síndicos já recebem vínculo acima.
    if (caller?.role === "SUPER_ADMIN") {
      await tx.userCondominium.create({
        data: {
          userId,
          condominiumId: created.id,
          role: "SUPER_ADMIN",
        },
      });
    }

    return created;
  });

  logger.info(`Condominium ${condominium.id} created by ${userId}`);

  return condominium;
}

export async function updateCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  data: UpdateCondominiumRequest,
  userId: string
) {
  const existing = await repo.findById(prisma, id);
  if (!existing) {
    throw new NotFoundError("Condomínio não encontrado");
  }

  if (data.cnpj && data.cnpj !== existing.cnpj) {
    const cnpjInUse = await repo.findByCnpj(prisma, data.cnpj);
    if (cnpjInUse) {
      throw new ConflictError("CNPJ já cadastrado");
    }
  }

  if (data.slug !== undefined) {
    const nextSlug = normalizeCondominiumSlug(data.slug);
    if (!isValidCondominiumSlugFormat(nextSlug)) {
      throw new BadRequestError(
        "Slug inválido: use apenas letras minúsculas, números e hífens (2–100 caracteres)."
      );
    }
    if (nextSlug !== existing.slug) {
      const taken = await repo.findBySlug(prisma, nextSlug);
      if (taken && taken.id !== id) {
        throw new ConflictError("Slug já em uso");
      }
    }
  }

  const updateData: Prisma.CondominiumUpdateInput = {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.slug !== undefined && {
      slug: normalizeCondominiumSlug(data.slug),
    }),
    ...(data.cnpj !== undefined && { cnpj: data.cnpj }),
    ...(data.status !== undefined && { status: data.status }),
    ...(data.whatsappPhone !== undefined && { whatsappPhone: data.whatsappPhone }),
    ...(data.whatsappBusinessId !== undefined && {
      whatsappBusinessId: data.whatsappBusinessId,
    }),
    ...(data.structure !== undefined && {
      structure: data.structure as Prisma.InputJsonValue,
    }),
  };

  const condominium = await repo.update(prisma, id, updateData);

  logger.info(`Condominium ${id} updated by ${userId}`);

  return condominium;
}

export async function deleteCondominium(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  userId: string
) {
  const existing = await repo.findByIdWithRelationCounts(prisma, id);
  if (!existing) {
    throw new NotFoundError("Condomínio não encontrado");
  }

  if (existing._count.residents > 0 || existing._count.users > 0) {
    throw new ConflictError(
      `Este condomínio possui ${existing._count.residents} moradores e ${existing._count.users} usuários vinculados. Remova-os primeiro.`
    );
  }

  await repo.deleteById(prisma, id);

  logger.info(`Condominium ${id} deleted by ${userId}`);
}

export async function getCondominiumById(prisma: PrismaClient, id: string) {
  return repo.findByIdWithCounts(prisma, id);
}

export async function getAllCondominiums(prisma: PrismaClient) {
  return repo.findAll(prisma);
}

export async function getCondominiumStats(prisma: PrismaClient, id: string) {
  return repo.getStats(prisma, id);
}
