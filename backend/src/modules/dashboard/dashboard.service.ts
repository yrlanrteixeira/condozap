import type { PrismaClient } from "@prisma/client";
import {
  findAllMetricsData,
  findMetricsDataByCondominium,
  findCondominiumsByIds,
  findComplaintsByCondominiumIds,
} from "./dashboard.repository";

export {
  findAllMetricsData as getAllMetricsData,
  findMetricsDataByCondominium as getCondominiumMetricsData,
};

interface ComplaintData {
  status: string;
  priority: string;
  category: string;
  createdAt: Date;
  resolvedAt?: Date | null;
  resident?: {
    tower?: string | null;
  } | null;
}

interface ResidentData {
  tower: string | null;
  type: string;
  consentWhatsapp: boolean;
}

interface MessageData {
  recipientCount?: number | null;
  whatsappStatus?: string | null;
  sentAt: Date;
}

interface UnifiedComplaint {
  id: number;
  condominiumId: string;
  category: string;
  content: string;
  status: string;
  priority: string;
  createdAt: Date;
  resident: { name: string };
  condominium: { name: string };
}

export function buildMetrics(
  complaints: ComplaintData[],
  residents: ResidentData[],
  messages: MessageData[]
) {
  return {
    complaints: {
      total: complaints.length,
      open: complaints.filter((c) => c.status === "NEW").length,
      inProgress: complaints.filter((c) => c.status === "IN_PROGRESS").length,
      resolved: complaints.filter((c) => c.status === "RESOLVED").length,
      byPriority: {
        CRITICAL: complaints.filter((c) => c.priority === "CRITICAL").length,
        HIGH: complaints.filter((c) => c.priority === "HIGH").length,
        MEDIUM: complaints.filter((c) => c.priority === "MEDIUM").length,
        LOW: complaints.filter((c) => c.priority === "LOW").length,
      },
      byCategory: complaints.reduce((acc: Record<string, number>, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {}),
      byTower: complaints.reduce((acc: Record<string, number>, c: any) => {
        const tower = c.resident?.tower || "Sem Torre";
        acc[tower] = (acc[tower] || 0) + 1;
        return acc;
      }, {}),
      avgResolutionTime: 0,
    },
    residents: {
      total: residents.length,
      withConsent: residents.filter((r) => r.consentWhatsapp).length,
      byType: {
        owner: residents.filter((r) => r.type === "OWNER").length,
        tenant: residents.filter((r) => r.type === "TENANT").length,
      },
      byTower: residents.reduce((acc: Record<string, number>, r) => {
        const towerKey = r.tower || "Sem Torre";
        acc[towerKey] = (acc[towerKey] || 0) + 1;
        return acc;
      }, {}),
    },
    messages: {
      totalSent: messages.length,
      totalRecipients: messages.reduce(
        (sum, m) => sum + (m.recipientCount || 0),
        0
      ),
      delivered: messages.filter(
        (m) => m.whatsappStatus === "DELIVERED" || m.whatsappStatus === "READ"
      ).length,
      read: messages.filter((m) => m.whatsappStatus === "READ").length,
      failed: messages.filter((m) => m.whatsappStatus === "FAILED").length,
      deliveryRate:
        messages.length > 0
          ? (messages.filter(
              (m) =>
                m.whatsappStatus === "DELIVERED" || m.whatsappStatus === "READ"
            ).length /
              messages.length) *
            100
          : 0,
      last7Days: messages.filter((m) => {
        const sentDate = new Date(m.sentAt);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return sentDate >= sevenDaysAgo;
      }).length,
    },
  };
}

export function buildUnifiedDashboard(
  condominiums: { id: string; name: string }[],
  complaints: UnifiedComplaint[]
) {
  const totalCondos = condominiums.length;
  const totalComplaints = complaints.length;
  const openComplaints = complaints.filter((c) => c.status === "NEW").length;
  const inProgressComplaints = complaints.filter(
    (c) => c.status === "IN_PROGRESS"
  ).length;
  const criticalComplaints = complaints.filter(
    (c) => c.priority === "CRITICAL"
  ).length;

  const urgentFeed = complaints
    .filter(
      (c) =>
        (c.priority === "CRITICAL" || c.priority === "HIGH") &&
        (c.status === "NEW" || c.status === "IN_PROGRESS")
    )
    .slice(0, 20)
    .map((c) => ({
      id: c.id.toString(),
      title: c.category,
      description:
        c.content.substring(0, 150) + (c.content.length > 150 ? "..." : ""),
      priority: c.priority as "CRITICAL" | "HIGH",
      timestamp: c.createdAt.toISOString(),
      condominiumId: c.condominiumId,
      condominiumName: c.condominium.name,
    }));

  const complaintsByCondo = condominiums.map((condo) => {
    const condoComplaints = complaints.filter(
      (c) => c.condominiumId === condo.id
    );
    return {
      id: condo.id,
      name: condo.name,
      address: "",
      total: condoComplaints.length,
      critical: condoComplaints.filter((c) => c.priority === "CRITICAL").length,
    };
  });

  return {
    totalCondos,
    totalComplaints,
    criticalComplaints,
    openComplaints,
    inProgressComplaints,
    urgentFeed,
    complaintsByCondo,
  };
}

const EMPTY_UNIFIED_DASHBOARD = {
  totalCondos: 0,
  totalComplaints: 0,
  criticalComplaints: 0,
  openComplaints: 0,
  inProgressComplaints: 0,
  urgentFeed: [],
  complaintsByCondo: [],
};

export function parseCondominiumIds(condominiumIds: string): string[] {
  return condominiumIds
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");
}

export async function getUnifiedDashboard(
  prisma: PrismaClient,
  filteredCondoIds: string[]
) {
  const condominiums = await findCondominiumsByIds(prisma, filteredCondoIds);

  if (condominiums.length === 0) {
    return EMPTY_UNIFIED_DASHBOARD;
  }

  const complaints = await findComplaintsByCondominiumIds(
    prisma,
    filteredCondoIds
  );

  return buildUnifiedDashboard(condominiums, complaints);
}
