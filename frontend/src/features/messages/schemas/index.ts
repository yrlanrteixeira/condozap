/**
 * Messages Feature - Zod Schemas
 */

import { z } from "zod";

export const MessageSchema = z.object({
  id: z.string(),
  condominiumId: z.string(),
  type: z.enum(["TEXT", "TEMPLATE", "IMAGE"]),
  scope: z.enum(["ALL", "TOWER", "FLOOR", "UNIT"]),
  targetTower: z.string().nullable().optional(),
  targetFloor: z.string().nullable().optional(),
  targetUnit: z.string().nullable().optional(),
  content: z.string(),
  whatsappMessageId: z.string().nullable().optional(),
  whatsappStatus: z.enum(["SENT", "DELIVERED", "READ", "FAILED"]),
  batchId: z.string().nullable().optional(),
  recipientCount: z.number(),
  sentBy: z.string(),
  sentAt: z.string(),
});

export const SendMessageSchema = z.object({
  condominium_id: z.string(),
  type: z.enum(["TEXT", "TEMPLATE", "IMAGE"]),
  scope: z.enum(["ALL", "TOWER", "FLOOR", "UNIT"]),
  target_tower: z.string().optional(),
  target_floor: z.string().optional(),
  target_unit: z.string().optional(),
  content: z.string().min(1, "Mensagem não pode estar vazia"),
  sent_by: z.string(),
});


