import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { ComplaintStatus } from "@prisma/client";

const reopenSchema = z.object({
  reason: z.string().min(10),
});

export async function reopenComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const complaintId = parseInt(id, 10);
  const user = request.user!;
  const body = reopenSchema.parse(request.body);

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { condominium: { select: { reopenDeadlineDays: true } } },
  });

  if (!complaint) throw new NotFoundError("Ocorrência");
  if (complaint.status !== ComplaintStatus.CLOSED) {
    throw new BadRequestError("Apenas ocorrências encerradas podem ser reabertas");
  }

  const closedAt = complaint.closedAt;
  if (!closedAt) {
    throw new BadRequestError("Ocorrência sem data de fechamento registrada");
  }

  const deadlineMs = complaint.condominium.reopenDeadlineDays * 24 * 60 * 60 * 1000;
  if (Date.now() - new Date(closedAt).getTime() > deadlineMs) {
    throw new BadRequestError(
      `O prazo de ${complaint.condominium.reopenDeadlineDays} dias para reabertura expirou`
    );
  }

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: ComplaintStatus.CLOSED,
      toStatus: ComplaintStatus.REOPENED,
      changedBy: user.id,
      action: "REOPEN",
      notes: body.reason,
    },
  });

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: { status: ComplaintStatus.REOPENED },
  });

  return reply.send(updated);
}
