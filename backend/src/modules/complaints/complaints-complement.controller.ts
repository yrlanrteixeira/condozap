import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { ComplaintStatus } from "@prisma/client";

const complementSchema = z.object({
  message: z.string().min(10),
});

export async function complementComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const complaintId = parseInt(id, 10);
  const user = request.user!;
  const body = complementSchema.parse(request.body);

  const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
  if (!complaint) throw new NotFoundError("Ocorrência");
  if (complaint.status !== ComplaintStatus.RETURNED) {
    throw new BadRequestError("Ocorrência não está aguardando complemento");
  }

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: ComplaintStatus.RETURNED,
      toStatus: ComplaintStatus.IN_PROGRESS,
      changedBy: user.id,
      action: "COMMENT",
      notes: body.message,
    },
  });

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: { status: ComplaintStatus.IN_PROGRESS },
  });

  return reply.send(updated);
}
