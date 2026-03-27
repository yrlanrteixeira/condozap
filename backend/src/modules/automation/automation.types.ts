import type { ComplaintPriority } from "@prisma/client";

export interface TriageDecision {
  sectorId: string | null;
  confidence: "high" | "medium" | "low";
  matchedBy: "category" | "keyword" | "none";
  suggestedPriority: ComplaintPriority | null;
}

export interface WorkflowAction {
  type: "auto_assign" | "auto_close" | "auto_resolve" | "send_reminder" | "escalate";
  complaintId: number;
  reason: string;
  payload: Record<string, unknown>;
}
