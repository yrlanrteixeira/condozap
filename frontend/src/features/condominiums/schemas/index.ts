/**
 * Condominiums Schemas
 */

import { z } from 'zod';

export const CreateCondominiumSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos (apenas números)'),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

export const UpdateCondominiumSchema = z.object({
  name: z.string().min(3).optional(),
  cnpj: z.string().regex(/^\d{14}$/).optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED']).optional(),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

export type CreateCondominiumInput = z.infer<typeof CreateCondominiumSchema>;
export type UpdateCondominiumInput = z.infer<typeof UpdateCondominiumSchema>;

