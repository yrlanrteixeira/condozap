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

export type WebhookVerifyQuery = z.infer<typeof webhookVerifyQuerySchema>;
export type WhatsAppWebhookBody = z.infer<typeof whatsappWebhookBodySchema>;

