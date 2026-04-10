import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { NotFoundError } from "../../shared/errors";
import { ComplaintStatus } from "@prisma/client";
import { whatsappService } from "../whatsapp/whatsapp.service";
import { toWhatsAppDigits } from "../../shared/utils/phone";
import { assertValidTransition } from "./complaints.transitions";

const returnSchema = z.object({
  reason: z.string().min(10),
});

export async function returnComplaintHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const complaintId = parseInt(id, 10);
  const user = request.user!;
  const body = returnSchema.parse(request.body);

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { resident: true },
  });

  if (!complaint) throw new NotFoundError("Ocorrência");

  assertValidTransition(complaint.status, ComplaintStatus.RETURNED);

  const updated = await prisma.complaint.update({
    where: { id: complaintId },
    data: { status: ComplaintStatus.RETURNED },
  });

  await prisma.complaintStatusHistory.create({
    data: {
      complaintId,
      fromStatus: complaint.status,
      toStatus: ComplaintStatus.RETURNED,
      changedBy: user.id,
      action: "RETURN",
      notes: body.reason,
    },
  });

  if (complaint.resident.consentWhatsapp) {
    whatsappService
      .sendTextMessage(
        toWhatsAppDigits(complaint.resident.phone),
        `Sua ocorrência #${complaintId} foi devolvida: ${body.reason}. Acesse o sistema para complementar.`
      )
      .catch(() => {});
  }

  return reply.send(updated);
}
