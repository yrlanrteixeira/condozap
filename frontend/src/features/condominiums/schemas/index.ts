/**
 * Condominiums Schemas
 */

import { z } from 'zod';

const optionalCondoSlug = z
  .string()
  .max(100)
  .optional()
  .refine(
    (s) =>
      !s ||
      s.trim() === '' ||
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.trim()),
    { message: 'Slug: apenas letras minúsculas, números e hífens (ex.: meu-condominio)' }
  );

export const CreateCondominiumSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos (apenas números)'),
  slug: optionalCondoSlug,
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

export const UpdateCondominiumSchema = z.object({
  name: z.string().min(3).optional(),
  slug: optionalCondoSlug,
  cnpj: z.string().regex(/^\d{14}$/).optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED']).optional(),
  whatsappPhone: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
});

export type CreateCondominiumInput = z.infer<typeof CreateCondominiumSchema>;
export type UpdateCondominiumInput = z.infer<typeof UpdateCondominiumSchema>;

