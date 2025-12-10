import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import {
  condoMetricsParamsSchema,
  unifiedQuerySchema,
  type CondoMetricsParams,
  type UnifiedQuery,
} from "./dashboard.schema";
import {
  buildMetrics,
  buildUnifiedDashboard,
  findComplaintsByCondominiumIds,
  findCondominiumsByIds,
  getAllMetricsData,
  getCondominiumMetricsData,
} from "./dashboard.service";

export async function getAllMetricsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const [complaints, residents, messages] = await getAllMetricsData(prisma);
  const metrics = buildMetrics(complaints, residents, messages);
  return reply.send(metrics);
}

export async function getCondominiumMetricsHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumId } = condoMetricsParamsSchema.parse(
    request.params
  ) as CondoMetricsParams;

  const [complaints, residents, messages] = await getCondominiumMetricsData(
    prisma,
    condominiumId
  );

  const metrics = buildMetrics(complaints, residents, messages);
  return reply.send(metrics);
}

export async function getUnifiedDashboardHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { condominiumIds } = unifiedQuerySchema.parse(
    request.query
  ) as UnifiedQuery;

  const condoIds = condominiumIds
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");

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

  const dashboard = buildUnifiedDashboard(condominiums, complaints);
  return reply.send(dashboard);
}
