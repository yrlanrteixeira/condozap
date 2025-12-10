export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type ComplaintPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ComplaintData {
  status: ComplaintStatus;
  priority: ComplaintPriority;
  category: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resident?: {
    tower?: string | null;
    name?: string;
  } | null;
  condominium?: {
    name: string;
  } | null;
  id?: number;
  content?: string;
  condominiumId?: string;
}

export interface ResidentData {
  tower: string;
  type: "OWNER" | "TENANT";
  consentWhatsapp: boolean;
}

export interface MessageData {
  recipientCount: number | null;
  whatsappStatus: string | null;
  sentAt: Date;
}

export interface UnifiedQuery {
  condominiumIds: string;
}

export interface CondoMetricsParams {
  condominiumId: string;
}
