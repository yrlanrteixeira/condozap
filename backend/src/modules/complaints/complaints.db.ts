import { PrismaClient, ComplaintStatus } from "@prisma/client";

export async function findAllComplaints(
  prisma: PrismaClient,
  filters: {
    condominiumId?: string;
    status?: string;
    priority?: string;
    category?: string;
  }
) {
  return prisma.complaint.findMany({
    where: {
      ...(filters.condominiumId && { condominiumId: filters.condominiumId }),
      ...(filters.status && { status: filters.status as ComplaintStatus }),
      ...(filters.priority && { priority: filters.priority as any }),
      ...(filters.category && { category: filters.category }),
    },
    include: {
      condominium: {
        select: {
          id: true,
          name: true,
        },
      },
      resident: {
        select: {
          id: true,
          name: true,
          phone: true,
          tower: true,
          floor: true,
          unit: true,
        },
      },
      attachments: true,
      statusHistory: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: [{ condominium: { name: "asc" } }, { createdAt: "desc" }],
  });
}

export async function findComplaintsByCondominium(
  prisma: PrismaClient,
  condominiumId: string,
  filters: {
    status?: string;
    priority?: string;
    category?: string;
  }
) {
  return prisma.complaint.findMany({
    where: {
      condominiumId,
      ...(filters.status && { status: filters.status as ComplaintStatus }),
      ...(filters.priority && { priority: filters.priority as any }),
      ...(filters.category && { category: filters.category }),
    },
    include: {
      resident: {
        select: {
          id: true,
          name: true,
          phone: true,
          tower: true,
          floor: true,
          unit: true,
        },
      },
      attachments: true,
      statusHistory: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function findComplaintById(prisma: PrismaClient, id: number) {
  return prisma.complaint.findUnique({
    where: { id },
    include: {
      resident: true,
      attachments: true,
      statusHistory: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function findComplaintWithResident(prisma: PrismaClient, id: number) {
  return prisma.complaint.findUnique({
    where: { id },
    include: { resident: true },
  });
}

export async function createComplaint(
  prisma: PrismaClient,
  data: {
    condominiumId: string;
    residentId: string;
    category: string;
    content: string;
    priority?: string;
    isAnonymous?: boolean;
  }
) {
  return prisma.complaint.create({
    data: {
      condominiumId: data.condominiumId,
      residentId: data.residentId,
      category: data.category,
      content: data.content,
      priority: (data.priority as any) || "MEDIUM",
      isAnonymous: data.isAnonymous || false,
    },
    include: {
      resident: true,
      attachments: true,
    },
  });
}

export async function updateComplaintStatus(
  prisma: PrismaClient,
  id: number,
  status: ComplaintStatus,
  userId: string
) {
  return prisma.complaint.update({
    where: { id },
    data: {
      status,
      ...(status === "RESOLVED" && {
        resolvedAt: new Date(),
        resolvedBy: userId,
      }),
    },
    include: {
      resident: true,
      statusHistory: true,
    },
  });
}

export async function updateComplaintPriority(
  prisma: PrismaClient,
  id: number,
  priority: string
) {
  return prisma.complaint.update({
    where: { id },
    data: { priority: priority as any },
    include: { resident: true },
  });
}

export async function updateComplaintTimestamp(prisma: PrismaClient, id: number) {
  return prisma.complaint.update({
    where: { id },
    data: { updatedAt: new Date() },
  });
}

export async function deleteComplaint(prisma: PrismaClient, id: number) {
  return prisma.complaint.delete({
    where: { id },
  });
}

export async function createStatusHistory(
  prisma: PrismaClient,
  data: {
    complaintId: number;
    fromStatus: ComplaintStatus;
    toStatus: ComplaintStatus;
    changedBy: string;
    notes?: string;
  }
) {
  return prisma.complaintStatusHistory.create({
    data,
  });
}


