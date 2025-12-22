import { z } from "zod";

export const messagesParamsSchema = z.object({
  condominiumId: z.string().min(1),
});

export const messagesQuerySchema = z.object({
  limit: z.coerce.number().optional(),
});

export const sendMessageSchema = z.object({
  condominium_id: z.string().min(1),
  type: z.enum(["TEXT", "TEMPLATE", "IMAGE"]),
  content: z.object({
    text: z.string().min(1),
  }),
  target: z.object({
    scope: z.enum(["ALL", "TOWER", "FLOOR", "UNIT"]),
    tower: z.string().optional(),
    floor: z.string().optional(),
    unit: z.string().optional(),
  }),
  sentBy: z.string().optional(),
});

export type MessagesParams = z.infer<typeof messagesParamsSchema>;
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
export type SendMessageBody = z.infer<typeof sendMessageSchema>;

