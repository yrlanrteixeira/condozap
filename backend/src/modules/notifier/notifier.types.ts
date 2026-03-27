import type { ComplaintPriority, ComplaintStatus } from "@prisma/client";

export type NotificationEvent =
  | {
      type: "complaint_created";
      complaintId: number;
      residentPhone: string;
      residentName: string;
      category: string;
    }
  | {
      type: "complaint_status_changed";
      complaintId: number;
      residentPhone: string;
      residentName: string;
      newStatus: ComplaintStatus;
      oldStatus: ComplaintStatus;
    }
  | {
      type: "complaint_assigned";
      complaintId: number;
      assigneePhone: string;
      assigneeName: string;
      category: string;
      priority: ComplaintPriority;
    }
  | {
      type: "complaint_comment";
      complaintId: number;
      recipientPhone: string;
      recipientName: string;
      authorName: string;
    }
  | {
      type: "sla_warning";
      complaintId: number;
      syndicPhone: string;
      syndicName: string;
      minutesRemaining: number;
      slaType: "response" | "resolution";
    }
  | {
      type: "sla_escalation";
      complaintId: number;
      syndicPhone: string;
      syndicName: string;
      category: string;
      priority: ComplaintPriority;
    }
  | {
      type: "csat_request";
      complaintId: number;
      residentPhone: string;
      residentName: string;
    }
  | {
      type: "approval_pending";
      userName: string;
      syndicPhone: string;
      condominiumName: string;
    };

export interface NotifyResult {
  whatsapp: { sent: boolean; messageId?: string; error?: string };
  inApp: { created: boolean; notificationId?: string };
}
