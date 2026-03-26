import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import { AuthUser } from "../../types/auth";
import { isSyndic } from "../../auth/roles";
import {
  createSector,
  deleteSector,
  listSectors,
  setSectorMembers,
  updateSector,
} from "./sectors.service";
import {
  createSectorSchema,
  sectorParamsSchema,
  setMembersSchema,
  updateSectorSchema,
} from "./sectors.schema";

const ensureCanManageSector = (user: AuthUser) => {
  if (isSyndic(user.role)) {
    return;
  }
  throw new Error("FORBIDDEN");
};

export const listSectorsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { condominiumId } = sectorParamsSchema.pick({ condominiumId: true }).parse(
    request.params
  );
  const sectors = await listSectors(prisma, condominiumId);
  return reply.send(sectors);
};

export const createSectorHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as AuthUser;
  try {
    ensureCanManageSector(user);
  } catch {
    return reply.status(403).send({ error: "Acesso negado" });
  }
  const { condominiumId } = sectorParamsSchema.pick({ condominiumId: true }).parse(
    request.params
  );
  const body = createSectorSchema.parse(request.body);
  const sector = await createSector(prisma, condominiumId, body);
  return reply.status(201).send(sector);
};

export const updateSectorHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as AuthUser;
  try {
    ensureCanManageSector(user);
  } catch {
    return reply.status(403).send({ error: "Acesso negado" });
  }
  const { condominiumId, sectorId } = sectorParamsSchema.parse(request.params);
  const body = updateSectorSchema.parse(request.body);
  const sector = await updateSector(prisma, condominiumId, sectorId, body);
  return reply.send(sector);
};

export const setSectorMembersHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as AuthUser;
  try {
    ensureCanManageSector(user);
  } catch {
    return reply.status(403).send({ error: "Acesso negado" });
  }
  const { condominiumId, sectorId } = sectorParamsSchema.parse(request.params);
  const body = setMembersSchema.parse(request.body);
  const sector = await setSectorMembers(prisma, condominiumId, sectorId, body);
  return reply.send(sector);
};

export const deleteSectorHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as AuthUser;
  try {
    ensureCanManageSector(user);
  } catch {
    return reply.status(403).send({ error: "Acesso negado" });
  }
  const { condominiumId, sectorId } = sectorParamsSchema.parse(request.params);
  await deleteSector(prisma, condominiumId, sectorId);
  return reply.send({ message: "Setor removido com sucesso" });
};
