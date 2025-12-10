import { PrismaClient } from "@prisma/client";
import type { ResidentType } from "./residents.types";

export async function findAllResidents(
  prisma: PrismaClient,
  filters: {
    condominiumId?: string;
    tower?: string;
    floor?: string;
    type?: string;
    search?: string;
  }
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

export async function findResidentsByCondominium(
  prisma: PrismaClient,
  condominiumId: string,
  filters: {
    tower?: string;
    floor?: string;
    type?: string;
    search?: string;
  }
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

export async function findResidentById(prisma: PrismaClient, id: string) {
  return prisma.resident.findUnique({
    where: { id },
    include: {
      condominium: true,
    },
  });
}

export async function checkEmailExists(
  prisma: PrismaClient,
  email: string,
  condominiumId: string,
  excludeId?: string
) {
  return prisma.resident.findFirst({
    where: {
      email,
      condominiumId,
      ...(excludeId && { id: { not: excludeId } }),
    },
  });
}

export async function checkUnitOccupied(
  prisma: PrismaClient,
  condominiumId: string,
  tower: string,
  floor: string,
  unit: string,
  excludeId?: string
) {
  return prisma.resident.findFirst({
    where: {
      condominiumId,
      tower,
      floor,
      unit,
      ...(excludeId && { id: { not: excludeId } }),
    },
  });
}

export async function createResident(
  prisma: PrismaClient,
  data: {
    condominiumId: string;
    name: string;
    email: string;
    phone: string;
    tower: string;
    floor: string;
    unit: string;
    type?: ResidentType;
    consentWhatsapp?: boolean;
    consentDataProcessing?: boolean;
  }
) {
  return prisma.resident.create({
    data: {
      ...data,
      type: data.type || "OWNER",
      consentWhatsapp: data.consentWhatsapp ?? true,
      consentDataProcessing: data.consentDataProcessing ?? true,
    },
  });
}

export async function updateResident(
  prisma: PrismaClient,
  id: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    tower?: string;
    floor?: string;
    unit?: string;
    type?: ResidentType;
    consentWhatsapp?: boolean;
    consentDataProcessing?: boolean;
  }
) {
  return prisma.resident.update({
    where: { id },
    data,
  });
}

export async function deleteResident(prisma: PrismaClient, id: string) {
  return prisma.resident.delete({
    where: { id },
  });
}

export async function countResidentComplaints(
  prisma: PrismaClient,
  id: string
) {
  return prisma.complaint.count({
    where: { residentId: id },
  });
}
