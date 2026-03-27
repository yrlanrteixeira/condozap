import { z } from "zod";

export const messagesParamsSchema = z.object({
  condominiumId: z.string().min(1),
});

export const messagesQuerySchema = z.object({
  limit: z.coerce.number().optional(),
});

export const sendMessageSchema = z.object({
  condominiumId: z.string().min(1),
  type: z.enum(["TEXT", "TEMPLATE", "IMAGE"]),
  content: z.object({
    text: z.string(),
  }),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
  target: z.object({
    scope: z.enum(["ALL", "TOWER", "FLOOR", "UNIT"]),
    tower: z.string().optional(),
    floor: z.string().optional(),
    unit: z.string().optional(),
  }),
  sentBy: z.string().optional(),
}).refine(
  (data) => data.type !== "IMAGE" || !!data.mediaUrl,
  { message: "mediaUrl é obrigatório para mensagens do tipo IMAGE", path: ["mediaUrl"] }
).refine(
  (data) => data.type !== "TEXT" || !!data.content.text?.trim(),
  { message: "content.text é obrigatório para mensagens do tipo TEXT", path: ["content", "text"] }
);

export const messageIdParamSchema = z.object({
  id: z.string().min(1),
});

export const messageStatsQuerySchema = z.object({
  condominiumId: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type MessagesParams = z.infer<typeof messagesParamsSchema>;
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
export type SendMessageBody = z.infer<typeof sendMessageSchema>;
export type MessageIdParams = z.infer<typeof messageIdParamSchema>;
export type MessageStatsQuery = z.infer<typeof messageStatsQuerySchema>;

