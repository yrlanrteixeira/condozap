import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { NotFoundError } from "../../shared/errors";

const updateExpirationSchema = z.object({
  accountExpiresAt: z.string().datetime().nullable(),
  condominiumId: z.string().min(1),
});

export async function updateAccountExpirationHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = request.params as { userId: string };
  const body = updateExpirationSchema.parse(request.body);

  // Verify target user belongs to the provided condominium
  const userCondo = await prisma.userCondominium.findFirst({
    where: { userId, condominiumId: body.condominiumId },
  });

  if (!userCondo) {
    throw new NotFoundError("Usuário não encontrado neste condomínio");
  }

  const expiresAt = body.accountExpiresAt ? new Date(body.accountExpiresAt) : null;

  // If setting a future date and user is suspended, reactivate
  const updateData: Record<string, unknown> = { accountExpiresAt: expiresAt };
  if (expiresAt && expiresAt > new Date()) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.status === "SUSPENDED") {
      updateData.status = "APPROVED";
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return reply.send({
    accountExpiresAt: updated.accountExpiresAt,
    status: updated.status,
  });
}
