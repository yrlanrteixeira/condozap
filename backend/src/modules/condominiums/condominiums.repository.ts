import { ComplaintStatus, Prisma, PrismaClient } from "@prisma/client";

const condominiumWithCounts = {
  _count: {
    select: {
      residents: true,
      users: true,
      complaints: true,
      messages: true,
    },
  },
} satisfies Prisma.CondominiumInclude;

const condominiumWithRelationCounts = {
  _count: {
    select: {
      residents: true,
      users: true,
    },
  },
} satisfies Prisma.CondominiumInclude;

const condominiumListSelect = {
  id: true,
  name: true,
  slug: true,
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
} satisfies Prisma.CondominiumSelect;

export const findByCnpj = (prisma: PrismaClient, cnpj: string) =>
  prisma.condominium.findUnique({
    where: { cnpj },
  });

export const findBySlug = (prisma: PrismaClient, slug: string) =>
  prisma.condominium.findUnique({
    where: { slug },
  });

export const create = (
  prisma: PrismaClient,
  data: {
    name: string;
    slug: string;
    cnpj: string;
    whatsappPhone?: string;
    whatsappBusinessId?: string;
    primarySyndicId?: string;
  }
) =>
  prisma.condominium.create({
    data: {
      name: data.name,
      slug: data.slug,
      cnpj: data.cnpj,
      status: "TRIAL",
      whatsappPhone: data.whatsappPhone,
      whatsappBusinessId: data.whatsappBusinessId,
      ...(data.primarySyndicId && {
        primarySyndic: { connect: { id: data.primarySyndicId } },
      }),
    },
  });

export const findById = (prisma: PrismaClient, id: string) =>
  prisma.condominium.findUnique({
    where: { id },
  });

export const findByIdWithCounts = (prisma: PrismaClient, id: string) =>
  prisma.condominium.findUnique({
    where: { id },
    include: condominiumWithCounts,
  });

export const findByIdWithRelationCounts = (
  prisma: PrismaClient,
  id: string
) =>
  prisma.condominium.findUnique({
    where: { id },
    include: condominiumWithRelationCounts,
  });

export const update = (
  prisma: PrismaClient,
  id: string,
  data: Prisma.CondominiumUpdateInput
) =>
  prisma.condominium.update({
    where: { id },
    data,
  });

export const deleteById = (prisma: PrismaClient, id: string) =>
  prisma.condominium.delete({
    where: { id },
  });

export const findAll = (prisma: PrismaClient) =>
  prisma.condominium.findMany({
    select: condominiumListSelect,
    orderBy: {
      name: "asc",
    },
  });

export const getStats = async (prisma: PrismaClient, id: string) => {
  const activeStatuses: ComplaintStatus[] = [
    "NEW",
    "TRIAGE",
    "IN_PROGRESS",
    "WAITING_USER",
    "WAITING_THIRD_PARTY",
  ];
  const resolvedStatuses: ComplaintStatus[] = ["RESOLVED", "CLOSED"];

  const [residentsCount, complaintsOpen, complaintsResolved, messagesCount] =
    await Promise.all([
      prisma.resident.count({ where: { condominiumId: id } }),
      prisma.complaint.count({
        where: {
          condominiumId: id,
          status: { in: activeStatuses },
        },
      }),
      prisma.complaint.count({
        where: {
          condominiumId: id,
          status: { in: resolvedStatuses },
        },
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
};
