import { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma";
import { requireSuperAdmin } from "../../middlewares";
import {
  condoMetricsParamsSchema,
  unifiedQuerySchema,
} from "./dashboard.schemas";
import {
  getAllMetricsData,
  getCondominiumMetricsData,
  findComplaintsByCondominiumIds,
  findCondominiumsByIds,
} from "./dashboard.db";
import type {
  ComplaintData,
  MessageData,
  ResidentData,
  CondoMetricsParams,
  UnifiedQuery,
} from "./dashboard.types.js";

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/metrics/all",
    {
      onRequest: [fastify.authenticate, requireSuperAdmin()],
    },
    async (_request, reply) => {
      const [complaints, residents, messages] = await getAllMetricsData(prisma);

      const metrics = {
        complaints: {
          total: complaints.length,
          open: complaints.filter((c: ComplaintData) => c.status === "OPEN")
            .length,
          inProgress: complaints.filter(
            (c: ComplaintData) => c.status === "IN_PROGRESS"
          ).length,
          resolved: complaints.filter(
            (c: ComplaintData) => c.status === "RESOLVED"
          ).length,
          byPriority: {
            CRITICAL: complaints.filter(
              (c: ComplaintData) => c.priority === "CRITICAL"
            ).length,
            HIGH: complaints.filter((c: ComplaintData) => c.priority === "HIGH")
              .length,
            MEDIUM: complaints.filter(
              (c: ComplaintData) => c.priority === "MEDIUM"
            ).length,
            LOW: complaints.filter((c: ComplaintData) => c.priority === "LOW")
              .length,
          },
          byCategory: complaints.reduce(
            (acc: Record<string, number>, c: ComplaintData) => {
              acc[c.category] = (acc[c.category] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          byTower: complaints.reduce((acc: Record<string, number>, c: any) => {
            const tower = c.resident?.tower || "Sem Torre";
            acc[tower] = (acc[tower] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          avgResolutionTime: 0,
        },
        residents: {
          total: residents.length,
          withConsent: residents.filter((r: ResidentData) => r.consentWhatsapp)
            .length,
          byType: {
            owner: residents.filter((r: ResidentData) => r.type === "OWNER")
              .length,
            tenant: residents.filter((r: ResidentData) => r.type === "TENANT")
              .length,
          },
          byTower: residents.reduce(
            (acc: Record<string, number>, r: ResidentData) => {
              acc[r.tower] = (acc[r.tower] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
        messages: {
          totalSent: messages.length,
          totalRecipients: messages.reduce(
            (sum: number, m: MessageData) => sum + (m.recipientCount || 0),
            0
          ),
          delivered: messages.filter(
            (m: MessageData) =>
              m.whatsappStatus === "DELIVERED" || m.whatsappStatus === "READ"
          ).length,
          read: messages.filter((m: MessageData) => m.whatsappStatus === "READ")
            .length,
          failed: messages.filter(
            (m: MessageData) => m.whatsappStatus === "FAILED"
          ).length,
          deliveryRate:
            messages.length > 0
              ? (messages.filter(
                  (m: MessageData) =>
                    m.whatsappStatus === "DELIVERED" ||
                    m.whatsappStatus === "READ"
                ).length /
                  messages.length) *
                100
              : 0,
          last7Days: messages.filter((m: MessageData) => {
            const sentDate = new Date(m.sentAt);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return sentDate >= sevenDaysAgo;
          }).length,
        },
      };

      return reply.send(metrics);
    }
  );

  fastify.get(
    "/metrics/:condominiumId",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumId } = condoMetricsParamsSchema.parse(
        request.params
      ) as CondoMetricsParams;

      const [complaints, residents, messages] = await getCondominiumMetricsData(
        prisma,
        condominiumId
      );

      const metrics = {
        complaints: {
          total: complaints.length,
          open: complaints.filter((c: ComplaintData) => c.status === "OPEN")
            .length,
          inProgress: complaints.filter(
            (c: ComplaintData) => c.status === "IN_PROGRESS"
          ).length,
          resolved: complaints.filter(
            (c: ComplaintData) => c.status === "RESOLVED"
          ).length,
          byPriority: {
            CRITICAL: complaints.filter(
              (c: ComplaintData) => c.priority === "CRITICAL"
            ).length,
            HIGH: complaints.filter((c: ComplaintData) => c.priority === "HIGH")
              .length,
            MEDIUM: complaints.filter(
              (c: ComplaintData) => c.priority === "MEDIUM"
            ).length,
            LOW: complaints.filter((c: ComplaintData) => c.priority === "LOW")
              .length,
          },
          byCategory: complaints.reduce(
            (acc: Record<string, number>, c: ComplaintData) => {
              acc[c.category] = (acc[c.category] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          byTower: complaints.reduce((acc: Record<string, number>, c: any) => {
            const tower = c.resident?.tower || "Sem Torre";
            acc[tower] = (acc[tower] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          avgResolutionTime: 0,
        },
        residents: {
          total: residents.length,
          withConsent: residents.filter((r: ResidentData) => r.consentWhatsapp)
            .length,
          byType: {
            owner: residents.filter((r: ResidentData) => r.type === "OWNER")
              .length,
            tenant: residents.filter((r: ResidentData) => r.type === "TENANT")
              .length,
          },
          byTower: residents.reduce(
            (acc: Record<string, number>, r: ResidentData) => {
              acc[r.tower] = (acc[r.tower] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
        messages: {
          totalSent: messages.length,
          totalRecipients: messages.reduce(
            (sum: number, m: MessageData) => sum + (m.recipientCount || 0),
            0
          ),
          delivered: messages.filter(
            (m: MessageData) =>
              m.whatsappStatus === "DELIVERED" || m.whatsappStatus === "READ"
          ).length,
          read: messages.filter((m: MessageData) => m.whatsappStatus === "READ")
            .length,
          failed: messages.filter(
            (m: MessageData) => m.whatsappStatus === "FAILED"
          ).length,
          deliveryRate:
            messages.length > 0
              ? (messages.filter(
                  (m: MessageData) =>
                    m.whatsappStatus === "DELIVERED" ||
                    m.whatsappStatus === "READ"
                ).length /
                  messages.length) *
                100
              : 0,
          last7Days: messages.filter((m: MessageData) => {
            const sentDate = new Date(m.sentAt);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return sentDate >= sevenDaysAgo;
          }).length,
        },
      };

      return reply.send(metrics);
    }
  );

  fastify.get(
    "/unified",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const { condominiumIds } = unifiedQuerySchema.parse(
        request.query
      ) as UnifiedQuery;

      const condoIds = condominiumIds
        .split(",")
        .filter((id) => id.trim() !== "");

      if (condoIds.length === 0) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Pelo menos um condomínio deve ser informado",
        });
      }

      const condominiums = await findCondominiumsByIds(prisma, condoIds);

      if (condominiums.length === 0) {
        return reply.send({
          totalCondos: 0,
          totalComplaints: 0,
          criticalComplaints: 0,
          openComplaints: 0,
          inProgressComplaints: 0,
          urgentFeed: [],
          complaintsByCondo: [],
        });
      }

      const complaints = await findComplaintsByCondominiumIds(prisma, condoIds);

      const totalCondos = condominiums.length;
      const totalComplaints = complaints.length;
      const openComplaints = complaints.filter(
        (c) => c.status === "OPEN"
      ).length;
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
            (c.status === "OPEN" || c.status === "IN_PROGRESS")
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
          critical: condoComplaints.filter((c) => c.priority === "CRITICAL")
            .length,
        };
      });

      return reply.send({
        totalCondos,
        totalComplaints,
        criticalComplaints,
        openComplaints,
        inProgressComplaints,
        urgentFeed,
        complaintsByCondo,
      });
    }
  );
};
