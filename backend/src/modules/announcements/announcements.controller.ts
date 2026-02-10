import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../shared/db/prisma";
import * as announcementService from "./announcements.service";

export async function getAnnouncementsByCondominiumHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id: condominiumId } = request.params;
  const list = await announcementService.findActiveByCondominium(
    prisma,
    condominiumId
  );
  return reply.send(list);
}
