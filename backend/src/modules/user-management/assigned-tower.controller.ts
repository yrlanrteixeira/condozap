import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { NotFoundError } from "../../shared/errors";

const updateAssignedTowerSchema = z.object({
  assignedTower: z.string().nullable(),
  condominiumId: z.string().min(1),
});

export async function updateAssignedTowerHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { userId } = request.params as { userId: string };
  const body = updateAssignedTowerSchema.parse(request.body);

  const result = await prisma.userCondominium.updateMany({
    where: { userId, condominiumId: body.condominiumId },
    data: { assignedTower: body.assignedTower },
  });

  if (result.count === 0) throw new NotFoundError("Vínculo usuário-condomínio");

  return reply.send({ assignedTower: body.assignedTower });
}
