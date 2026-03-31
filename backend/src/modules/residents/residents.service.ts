import { PrismaClient } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { ConflictError, NotFoundError } from "../../shared/errors";
import type {
  CreateResidentRequest,
  ResidentFilters,
  UpdateConsentRequest,
  UpdateResidentRequest,
  ResidentType,
} from "./residents.schema";

function normalizeEmailForComparison(email: string): string {
  return email.trim().toLowerCase();
}

export async function createResident(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  data: CreateResidentRequest
) {
  const emailExists = await prisma.resident.findFirst({
    where: {
      email: data.email,
      condominiumId: data.condominiumId,
    },
  });
  if (emailExists) {
    throw new ConflictError("Email já cadastrado neste condomínio");
  }

  const unitOccupied = await prisma.resident.findFirst({
    where: {
      condominiumId: data.condominiumId,
      tower: data.tower,
      floor: data.floor,
      unit: data.unit,
    },
  });
  if (unitOccupied) {
    throw new ConflictError("Esta unidade já está ocupada");
  }

  const resident = await prisma.resident.create({
    data: {
      ...data,
      type: (data.type as ResidentType) || "OWNER",
      consentWhatsapp: data.consentWhatsapp ?? true,
      consentDataProcessing: data.consentDataProcessing ?? true,
    },
  });

  logger.info(`Resident ${resident.id} created`);

  return resident;
}

export async function updateResident(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  data: UpdateResidentRequest
) {
  const existing = await prisma.resident.findUnique({
    where: { id },
    include: { condominium: true },
  });
  if (!existing) {
    throw new NotFoundError("Morador");
  }

  // Só valida duplicidade se o e-mail mudou. Vários moradores podem compartilhar o
  // placeholder padrão (pendente@talkzap.com); sem isso, qualquer PATCH recorrente
  // encontraria "outro" morador com o mesmo e-mail e retornaria 409.
  if (
    data.email &&
    normalizeEmailForComparison(data.email) !==
      normalizeEmailForComparison(existing.email)
  ) {
    const emailExists = await prisma.resident.findFirst({
      where: {
        email: data.email,
        condominiumId: existing.condominiumId,
        id: { not: id },
      },
    });
    if (emailExists) {
      throw new ConflictError("Email já cadastrado neste condomínio");
    }
  }

  if (data.tower || data.floor || data.unit) {
    const unitOccupied = await prisma.resident.findFirst({
      where: {
        condominiumId: existing.condominiumId,
        tower: data.tower || existing.tower,
        floor: data.floor || existing.floor,
        unit: data.unit || existing.unit,
        id: { not: id },
      },
    });
    if (unitOccupied) {
      throw new ConflictError("Esta unidade já está ocupada");
    }
  }

  const resident = await prisma.resident.update({
    where: { id },
    data,
  });

  logger.info(`Resident ${id} updated`);

  return resident;
}

export async function deleteResident(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string
) {
  const existing = await prisma.resident.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new NotFoundError("Morador");
  }

  const complaintsCount = await prisma.complaint.count({
    where: { residentId: id },
  });
  if (complaintsCount > 0) {
    throw new ConflictError(
      `Não é possível excluir morador com ${complaintsCount} denúncias`
    );
  }

  await prisma.resident.delete({
    where: { id },
  });

  logger.info(`Resident ${id} deleted`);
}

export async function updateResidentConsent(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  id: string,
  body: UpdateConsentRequest
) {
  const updateData: Record<string, boolean> = {};
  if (body.consent_whatsapp !== undefined) updateData.consentWhatsapp = body.consent_whatsapp;
  if (body.consent_data_processing !== undefined) updateData.consentDataProcessing = body.consent_data_processing;
  if (body.consentWhatsapp !== undefined) updateData.consentWhatsapp = body.consentWhatsapp;
  if (body.consentDataProcessing !== undefined) updateData.consentDataProcessing = body.consentDataProcessing;

  return updateResident(prisma, logger, id, updateData);
}

export async function getResidentById(prisma: PrismaClient, id: string) {
  return prisma.resident.findUnique({
    where: { id },
    include: {
      condominium: true,
    },
  });
}

export async function getAllResidents(
  prisma: PrismaClient,
  filters: ResidentFilters
) {
  return prisma.resident.findMany({
    where: {
      ...(filters.condominiumId && { condominiumId: filters.condominiumId }),
      ...(filters.tower && { tower: filters.tower }),
      ...(filters.floor && { floor: filters.floor }),
      ...(filters.type && { type: filters.type as ResidentType }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search } },
        ],
      }),
    },
    include: {
      condominium: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { condominium: { name: "asc" } },
      { tower: "asc" },
      { floor: "asc" },
      { unit: "asc" },
    ],
  });
}

export async function importResidents(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  condominiumId: string,
  residents: Array<{
    name: string;
    email: string;
    phone: string;
    tower: string;
    floor: string;
    unit: string;
    type?: string;
  }>
) {
  const results = [];
  const errors = [];

  for (const residentData of residents) {
    try {
      const resident = await createResident(prisma, logger, {
        ...residentData,
        condominiumId,
        type: (residentData.type as ResidentType) || "OWNER",
        consentWhatsapp: true,
        consentDataProcessing: true,
      });
      results.push(resident);
    } catch (error: any) {
      errors.push({
        data: residentData,
        error: error.message,
      });
    }
  }

  logger.info(`Imported ${results.length} residents, ${errors.length} errors`);

  return { imported: results, errors, total: residents.length };
}

export async function getResidentsByCondominium(
  prisma: PrismaClient,
  condominiumId: string,
  filters: Omit<ResidentFilters, "condominiumId">
) {
  return prisma.resident.findMany({
    where: {
      condominiumId,
      ...(filters.tower && { tower: filters.tower }),
      ...(filters.floor && { floor: filters.floor }),
      ...(filters.type && { type: filters.type as ResidentType }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search } },
        ],
      }),
    },
    orderBy: [{ tower: "asc" }, { floor: "asc" }, { unit: "asc" }],
  });
}
