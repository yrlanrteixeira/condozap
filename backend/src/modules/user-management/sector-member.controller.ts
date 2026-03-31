import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db/prisma";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { EMAIL_CONFLICT_MESSAGE } from "./messages";
import bcrypt from "bcryptjs";
import { UserRole as PrismaUserRole } from "@prisma/client";

const createSectorMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3),
  password: z.string().min(8),
  condominiumId: z.string().min(1),
  sectorId: z.string().min(1),
});

export async function createSectorMemberHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const body = createSectorMemberSchema.parse(request.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    throw new ConflictError(EMAIL_CONFLICT_MESSAGE);
  }

  const sector = await prisma.sector.findUnique({ where: { id: body.sectorId } });
  if (!sector || sector.condominiumId !== body.condominiumId) {
    throw new NotFoundError("Setor");
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: hashedPassword,
        role: "SETOR_MEMBER" as PrismaUserRole,
        permissionScope: "LOCAL",
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: (request.user as any).id,
      },
    });

    await tx.userCondominium.create({
      data: {
        userId: user.id,
        condominiumId: body.condominiumId,
        role: "SETOR_MEMBER" as PrismaUserRole,
      },
    });

    const membership = await tx.sectorMember.create({
      data: {
        sectorId: body.sectorId,
        userId: user.id,
        isActive: true,
      },
    });

    return { user, membership };
  });

  return reply.code(201).send({
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    sectorMemberId: result.membership.id,
  });
}
