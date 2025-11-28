import { z } from 'zod';

/**
 * Schemas de validação para Messages
 * Valida envio de mensagens WhatsApp com diferentes escopos
 */

export const MessageTypeEnum = z.enum(['text', 'template', 'image']);
export const MessageScopeEnum = z.enum(['all', 'tower', 'floor', 'unit']);
export const MessageStatusEnum = z.enum(['sent', 'delivered', 'read', 'failed']);

export const MessageSchema = z.object({
  id: z.number().int().positive().optional(),
  condominiumId: z.string().cuid('ID do condomínio inválido'),
  timestamp: z.string().datetime(),
  type: MessageTypeEnum,
  templateName: z.string().optional().nullable(),
  scope: MessageScopeEnum,
  target: z.string(),
  phone: z.string().optional(),
  content: z.string().min(1, 'Mensagem não pode estar vazia'),
  status: MessageStatusEnum.default('sent'),
});

/**
 * Schema para envio de mensagem de texto
 */
export const SendTextMessageSchema = z.object({
  condominiumId: z.string().cuid(),
  type: z.literal('text'),
  scope: MessageScopeEnum,
  content: z.string()
    .min(1, 'Mensagem vazia')
    .max(4096, 'WhatsApp permite no máximo 4096 caracteres'),

  // Campos condicionais baseados no scope
  tower: z.string().optional(),
  floor: z.string().optional(),
  unit: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validação condicional: tower, floor, unit devem existir conforme scope
  if (data.scope === 'tower' && !data.tower) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Torre é obrigatória quando scope = tower',
      path: ['tower'],
    });
  }

  if (data.scope === 'floor') {
    if (!data.tower || !data.floor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Torre e andar são obrigatórios quando scope = floor',
        path: ['floor'],
      });
    }
  }

  if (data.scope === 'unit') {
    if (!data.tower || !data.floor || !data.unit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Torre, andar e unidade são obrigatórios quando scope = unit',
        path: ['unit'],
      });
    }
  }
});

/**
 * Schema para envio de template (mensagens pré-aprovadas pelo WhatsApp)
 */
export const SendTemplateMessageSchema = z.object({
  condominiumId: z.string().cuid(),
  type: z.literal('template'),
  templateName: z.string().min(1, 'Nome do template obrigatório'),
  scope: MessageScopeEnum,

  // Parâmetros dinâmicos do template
  parameters: z.array(z.object({
    type: z.string(),
    text: z.string().optional(),
  })).optional(),

  tower: z.string().optional(),
  floor: z.string().optional(),
  unit: z.string().optional(),
});

/**
 * Schema para atualização de status (webhook do Meta)
 */
export const UpdateMessageStatusSchema = z.object({
  whatsappMessageId: z.string(),
  status: MessageStatusEnum,
  timestamp: z.string().datetime(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

/**
 * Schema para validação de telefone (antes de enviar)
 */
export const ValidatePhoneSchema = z.object({
  phone: z.string()
    .regex(/^55\d{10,11}$/, 'Formato inválido (esperado: 5511999990000)')
    .transform(p => p.replace(/\D/g, '')),
});

// Types inferidos
export type MessageInput = z.infer<typeof MessageSchema>;
export type SendTextMessageInput = z.infer<typeof SendTextMessageSchema>;
export type SendTemplateMessageInput = z.infer<typeof SendTemplateMessageSchema>;
export type UpdateMessageStatusInput = z.infer<typeof UpdateMessageStatusSchema>;
export type ValidatePhoneInput = z.infer<typeof ValidatePhoneSchema>;
