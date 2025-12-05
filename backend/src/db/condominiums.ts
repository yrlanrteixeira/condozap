/**
 * Condominiums Data Access
 *
 * Simple functions for database operations
 */

import { PrismaClient } from "@prisma/client";

// ============================================
// Query Functions
// ============================================

export async function findAllCondominiums(prisma: PrismaClient) {
  return prisma.condominium.findMany({
    select: {
      id: true,
      name: true,
      cnpj: true,
      status: true,
      whatsappPhone: true,
      whatsappBusinessId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          residents: true,
          users: true,
          complaints: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function findCondominiumById(prisma: PrismaClient, id: string) {
  return prisma.condominium.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          residents: true,
          users: true,
          complaints: true,
          messages: true,
        },
      },
    },
  });
}

export async function findCondominiumByCnpj(prisma: PrismaClient, cnpj: string) {
  return prisma.condominium.findUnique({
    where: { cnpj },
  });
}

export async function findCondominiumWithCounts(
  prisma: PrismaClient,
  id: string
) {
  return prisma.condominium.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          residents: true,
          users: true,
        },
      },
    },
  });
}

// ============================================
// Mutation Functions
// ============================================

export async function createCondominium(
  prisma: PrismaClient,
  data: {
    name: string;
    cnpj: string;
    whatsappPhone?: string;
    whatsappBusinessId?: string;
  }
) {
  return prisma.condominium.create({
    data: {
      name: data.name,
      cnpj: data.cnpj,
      status: "TRIAL",
      whatsappPhone: data.whatsappPhone,
      whatsappBusinessId: data.whatsappBusinessId,
    },
  });
}

export async function updateCondominium(
  prisma: PrismaClient,
  id: string,
  data: {
    name?: string;
    cnpj?: string;
    status?: "TRIAL" | "ACTIVE" | "SUSPENDED";
    whatsappPhone?: string;
    whatsappBusinessId?: string;
  }
) {
  return prisma.condominium.update({
    where: { id },
    data,
  });
}

export async function deleteCondominium(prisma: PrismaClient, id: string) {
  return prisma.condominium.delete({
    where: { id },
  });
}

// ============================================
// Stats Functions
// ============================================

export async function getCondominiumStats(prisma: PrismaClient, id: string) {
  const [residentsCount, complaintsOpen, complaintsResolved, messagesCount] =
    await Promise.all([
      prisma.resident.count({ where: { condominiumId: id } }),
      prisma.complaint.count({ where: { condominiumId: id, status: "OPEN" } }),
      prisma.complaint.count({
        where: { condominiumId: id, status: "RESOLVED" },
      }),
      prisma.message.count({ where: { condominiumId: id } }),
    ]);

  return {
    residents: residentsCount,
    complaints: {
      open: complaintsOpen,
      resolved: complaintsResolved,
      total: complaintsOpen + complaintsResolved,
    },
    messages: messagesCount,
  };
}
