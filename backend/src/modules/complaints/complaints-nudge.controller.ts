import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { evolutionService } from "../evolution/evolution.service";

const NUDGE_COOLDOWN_HOURS = 24;

export async function nudgeComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const complaintId = parseInt(id, 10);
  const user = request.user!;

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      sector: { include: { members: { where: { isActive: true }, include: { user: true } } } },
      condominium: true,
    },
  });

  if (!complaint) {
    throw new NotFoundError("Ocorrência não encontrada");
  }

  if (!complaint.sectorId || !complaint.sector) {
    throw new BadRequestError("Ocorrência não está atribuída a um setor");
  }

  const closedStatuses = ["RESOLVED", "CLOSED", "CANCELLED"];
  if (closedStatuses.includes(complaint.status)) {
    throw new BadRequestError("Não é possível cobrar posicionamento de ocorrência finalizada");
  }

  // Cooldown check
  if (complaint.lastNudgedAt) {
    const hoursSinceLastNudge =
      (Date.now() - new Date(complaint.lastNudgedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastNudge < NUDGE_COOLDOWN_HOURS) {
      const nextNudgeAt = new Date(
        new Date(complaint.lastNudgedAt).getTime() + NUDGE_COOLDOWN_HOURS * 60 * 60 * 1000
      );
      throw new BadRequestError(
        `Aguarde até ${nextNudgeAt.toLocaleString("pt-BR")} para cobrar novamente`
      );
    }
  }

  // Create status history entry
  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: complaint.status,
      changedBy: user.id,
      action: "NUDGE",
      notes: `Cobrança de posicionamento ao setor ${complaint.sector.name}`,
    },
  });

  // Update lastNudgedAt
  await prisma.complaint.update({
    where: { id: complaintId },
    data: { lastNudgedAt: new Date() },
  });

  // Send WhatsApp to active sector members
  let notifiedCount = 0;
  const message = `Ocorrência #${complaintId} (${complaint.category}) aguarda posicionamento do setor ${complaint.sector.name}. Por favor, atualize o status.`;

  for (const member of complaint.sector.members) {
    const memberUser = member.user;
    const phone = memberUser.requestedPhone;
    if (phone) {
      try {
        await evolutionService.sendText({ number: phone, text: message });
        notifiedCount++;
      } catch (err) {
        request.log.warn({ err, userId: memberUser.id }, "Failed to send nudge WhatsApp");
      }
    }
  }

  const nextNudgeAt = new Date(Date.now() + NUDGE_COOLDOWN_HOURS * 60 * 60 * 1000);

  return reply.send({
    success: true,
    notifiedCount,
    nextNudgeAt: nextNudgeAt.toISOString(),
  });
}
