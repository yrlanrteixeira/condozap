import { ComplaintStatus, ComplaintPriority } from "@prisma/client";
import { BadRequestError } from "../../shared/errors";

export const DEFAULT_SLA_BY_PRIORITY: Record<
  ComplaintPriority,
  {
    responseMinutes: number;
    resolutionMinutes: number;
    escalationBuffer: number;
  }
> = {
  CRITICAL: {
    responseMinutes: 15,
    resolutionMinutes: 240,
    escalationBuffer: 30,
  },
  HIGH: { responseMinutes: 60, resolutionMinutes: 480, escalationBuffer: 60 },
  MEDIUM: {
    responseMinutes: 240,
    resolutionMinutes: 1440,
    escalationBuffer: 60,
  },
  LOW: { responseMinutes: 480, resolutionMinutes: 4320, escalationBuffer: 120 },
};

export const SLA_ACTIONS = {
  STATUS_CHANGE: "STATUS_CHANGE",
  SLA_PAUSE: "SLA_PAUSE",
  SLA_RESUME: "SLA_RESUME",
  ASSIGNMENT: "ASSIGNMENT",
  ESCALATION: "SLA_ESCALATION",
  COMMENT: "COMMENT",
} as const;

export const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: [
    ComplaintStatus.TRIAGE,
    ComplaintStatus.IN_PROGRESS,
    ComplaintStatus.CANCELLED,
  ],
  NEW: [
    ComplaintStatus.TRIAGE,
    ComplaintStatus.IN_PROGRESS,
    ComplaintStatus.CANCELLED,
  ],
  TRIAGE: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.CANCELLED],
  IN_PROGRESS: [
    ComplaintStatus.WAITING_USER,
    ComplaintStatus.WAITING_THIRD_PARTY,
    ComplaintStatus.RESOLVED,
    ComplaintStatus.CANCELLED,
  ],
  WAITING_USER: [ComplaintStatus.IN_PROGRESS],
  WAITING_THIRD_PARTY: [ComplaintStatus.IN_PROGRESS],
  RESOLVED: [ComplaintStatus.CLOSED],
  CLOSED: [],
  CANCELLED: [],
};

export const assertValidTransition = (
  fromStatus: ComplaintStatus,
  toStatus: ComplaintStatus
) => {
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new BadRequestError(
      `Transição de ${fromStatus} para ${toStatus} não é permitida`
    );
  }
};
