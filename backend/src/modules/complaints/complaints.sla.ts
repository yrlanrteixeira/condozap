import {
  PrismaClient,
  ComplaintStatus,
  ComplaintPriority,
  SlaConfig,
} from "@prisma/client";
import { FastifyBaseLogger } from "fastify";
import { NotFoundError } from "../../shared/errors";
import { DEFAULT_SLA_BY_PRIORITY, SLA_ACTIONS } from "./complaints.transitions";

export function addMinutes(date: Date, minutes: number) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export async function findSlaConfig(
  prisma: PrismaClient,
  condominiumId: string,
  priority: ComplaintPriority
): Promise<
  Pick<SlaConfig, "responseMinutes" | "resolutionMinutes"> & {
    escalationBuffer: number;
  }
> {
  const config = await prisma.slaConfig.findUnique({
    where: {
      condominiumId_priority: {
        condominiumId,
        priority,
      },
    },
  });

  if (config) {
    return {
      responseMinutes: config.responseMinutes,
      resolutionMinutes: config.resolutionMinutes,
      escalationBuffer: config.escalationBufferMinutes,
    };
  }

  return DEFAULT_SLA_BY_PRIORITY[priority];
}

export async function resolveAssignee(
  prisma: PrismaClient,
  sectorId: string,
  explicitAssignee?: string
) {
  if (explicitAssignee) {
    const member = await prisma.sectorMember.findFirst({
      where: { sectorId, userId: explicitAssignee, isActive: true },
    });
    if (!member) {
      throw new NotFoundError("Assignee not active in sector");
    }
    await prisma.sectorMember.update({
      where: { id: member.id },
      data: { workload: { increment: 1 } },
    });
    return explicitAssignee;
  }

  const member = await prisma.sectorMember.findFirst({
    where: { sectorId, isActive: true },
    orderBy: [{ workload: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  if (!member) {
    return null;
  }

  await prisma.sectorMember.update({
    where: { id: member.id },
    data: { workload: { increment: 1 } },
  });

  return member.userId;
}

export async function runSlaEscalationScan(
  prisma: PrismaClient,
  logger: FastifyBaseLogger,
  condominiumId?: string
) {
  const now = new Date();
  const overdueComplaints = await prisma.complaint.findMany({
    where: {
      ...(condominiumId && { condominiumId }),
      escalatedAt: null,
      OR: [
        { responseDueAt: { lt: now }, responseAt: null },
        {
          resolutionDueAt: { lt: now },
          status: {
            notIn: [
              ComplaintStatus.RESOLVED,
              ComplaintStatus.CLOSED,
              ComplaintStatus.CANCELLED,
            ],
          },
        },
      ],
    },
    include: {
      condominium: true,
    },
  });

  for (const complaint of overdueComplaints) {
    const slaConfig = await findSlaConfig(
      prisma,
      complaint.condominiumId,
      complaint.priority as ComplaintPriority
    );

    const responseDeadlineWithBuffer =
      complaint.responseDueAt &&
      addMinutes(complaint.responseDueAt, slaConfig.escalationBuffer);
    const resolutionDeadlineWithBuffer =
      complaint.resolutionDueAt &&
      addMinutes(complaint.resolutionDueAt, slaConfig.escalationBuffer);

    if (
      (responseDeadlineWithBuffer &&
        responseDeadlineWithBuffer > now &&
        !complaint.responseAt) ||
      (resolutionDeadlineWithBuffer &&
        resolutionDeadlineWithBuffer > now &&
        !(
          [
            ComplaintStatus.RESOLVED,
            ComplaintStatus.CLOSED,
            ComplaintStatus.CANCELLED,
          ] as ComplaintStatus[]
        ).includes(complaint.status))
    ) {
      continue;
    }

    const syndic = await prisma.userCondominium.findFirst({
      where: {
        condominiumId: complaint.condominiumId,
        role: { in: ["SYNDIC", "PROFESSIONAL_SYNDIC"] },
      },
      include: { user: true },
    });

    const escalationTargetId = syndic?.userId;

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        assigneeId: escalationTargetId ?? null,
        escalationTargetId: escalationTargetId ?? null,
        escalatedAt: now,
        status: ComplaintStatus.IN_PROGRESS,
      },
    });
    if (complaint.sectorId) {
      await prisma.complaintAssignment.create({
        data: {
          complaintId: complaint.id,
          sectorId: complaint.sectorId,
          assigneeId: escalationTargetId ?? null,
          assignedBy: "system",
          reason: "SLA escalonada para o síndico",
        },
      });
    }
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        fromStatus: complaint.status,
        toStatus: ComplaintStatus.IN_PROGRESS,
        changedBy: "system",
        notes: "SLA estourado - escalonado ao síndico",
        action: SLA_ACTIONS.ESCALATION,
        metadata: {
          responseDueAt: complaint.responseDueAt,
          resolutionDueAt: complaint.resolutionDueAt,
        },
      },
    });

    logger.warn(
      { complaintId: complaint.id },
      "Complaint escalated to syndic due to SLA breach"
    );
  }

  return { processed: overdueComplaints.length };
}
