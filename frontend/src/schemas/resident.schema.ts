import { z } from 'zod';

/**
 * Schema de validação para Resident
 * Valida dados de moradores com telefone no formato E.164
 */
export const ResidentSchema = z.object({
  id: z.string().cuid().optional(), // CUID gerado pelo backend
  condominiumId: z.string().cuid('ID do condomínio inválido'),
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(100, 'Nome muito longo'),
  phone: z.string()
    .regex(/^55\d{10,11}$/, 'Telefone inválido (formato: 5511999990000)')
    .transform(phone => phone.replace(/\D/g, '')), // Remove caracteres não numéricos
  tower: z.string().min(1, 'Torre é obrigatória'),
  floor: z.string().min(1, 'Andar é obrigatório'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
});

/**
 * Schema para criação de morador (sem ID)
 */
export const CreateResidentSchema = ResidentSchema.omit({ id: true });

/**
 * Schema para atualização parcial de morador
 */
export const UpdateResidentSchema = ResidentSchema.partial().required({ id: true });

/**
 * Schema para importação de CSV
 * Permite telefone com ou sem formatação
 */
export const ImportResidentSchema = z.object({
  name: z.string().min(3, 'Nome inválido na linha'),
  phone: z.string()
    .transform(p => p.replace(/\D/g, ''))
    .refine(p => /^55\d{10,11}$/.test(p), 'Telefone inválido'),
  tower: z.string().min(1, 'Torre obrigatória'),
  floor: z.string().min(1, 'Andar obrigatório'),
  unit: z.string().min(1, 'Unidade obrigatória'),
  condominiumId: z.string().cuid(),
});

// Types inferidos dos schemas
export type ResidentInput = z.infer<typeof ResidentSchema>;
export type CreateResidentInput = z.infer<typeof CreateResidentSchema>;
export type UpdateResidentInput = z.infer<typeof UpdateResidentSchema>;
export type ImportResidentInput = z.infer<typeof ImportResidentSchema>;
