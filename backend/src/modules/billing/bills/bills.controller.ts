import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../shared/db/prisma";
import type { AuthUser } from "../../../types/auth";
import { toPublicBillDto } from "../lib/dtos";
import { createManualBillSchema } from "./bills.schema";
import * as service from "./bills.service";

export async function createPixBillHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthUser;
  const bill = await service.createPixBillForCurrentCycle(prisma, user.id);
  return reply.send(toPublicBillDto(bill));
}

export async function createCardBillHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthUser;
  const bill = await service.createCardBillForCurrentCycle(prisma, user.id);
  return reply.send(toPublicBillDto(bill));
}

export async function listMyBillsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = request.user as AuthUser;
  const bills = await service.listMyBills(prisma, user.id);
  return reply.send(bills.map(toPublicBillDto));
}

export async function listBillsForSyndicHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { syndicId } = request.params as { syndicId: string };
  const bills = await service.listBillsForSyndic(prisma, syndicId);
  return reply.send(bills.map(toPublicBillDto));
}

export async function createManualBillHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { syndicId } = request.params as { syndicId: string };
  const body = createManualBillSchema.parse(request.body);
  const bill = await service.createManualBill(
    prisma,
    syndicId,
    body.amountCents,
    body.description,
  );
  return reply.send(toPublicBillDto(bill));
}
