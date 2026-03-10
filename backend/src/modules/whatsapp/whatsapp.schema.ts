import { z } from "zod";

export const webhookVerifyQuerySchema = z.object({
  "hub.mode": z.string().optional(),
  "hub.verify_token": z.string().optional(),
  "hub.challenge": z.string().optional(),
});

export const whatsappWebhookBodySchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z.array(
          z.object({
            value: z.object({
              statuses: z
                .array(
                  z.object({
                    id: z.string(),
                    status: z.string(),
                  })
                )
                .optional()
                .default([]),
            }),
          })
        ),
      })
    )
    .optional()
    .default([]),
});

export const sendWhatsAppSchema = z.object({
  to: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["text", "template"]).default("text"),
  condominium_id: z.string().min(1),
});

export const sendBulkWhatsAppSchema = z.object({
  condominium_id: z.string().min(1),
  recipients: z.array(
    z.object({
      phone: z.string().min(1),
      name: z.string().optional(),
    })
  ),
  message: z.string().min(1),
});

export type WebhookVerifyQuery = z.infer<typeof webhookVerifyQuerySchema>;
export type WhatsAppWebhookBody = z.infer<typeof whatsappWebhookBodySchema>;
export type SendWhatsAppBody = z.infer<typeof sendWhatsAppSchema>;
export type SendBulkWhatsAppBody = z.infer<typeof sendBulkWhatsAppSchema>;

