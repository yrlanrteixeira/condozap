import { z } from 'zod';

/**
 * Schemas de validação para Condominium
 * Inclui validação de CNPJ e estrutura de torres/andares
 */

/**
 * Validador customizado de CNPJ
 * Aceita CNPJ com ou sem formatação
 */
const cnpjRegex = /^\d{14}$/;

export const CondominiumSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string()
    .min(3, 'Nome deve ter ao menos 3 caracteres')
    .max(100, 'Nome muito longo'),
  cnpj: z.string()
    .transform(c => c.replace(/\D/g, '')) // Remove pontos, barras, hífens
    .refine(c => cnpjRegex.test(c), 'CNPJ inválido (14 dígitos)'),
  address: z.string()
    .min(10, 'Endereço muito curto')
    .max(200, 'Endereço muito longo'),
  towers: z.array(z.string().min(1)).min(1, 'Pelo menos uma torre é obrigatória'),

  // Campos opcionais do roadmap (Fase 2)
  whatsappPhone: z.string()
    .regex(/^55\d{10,11}$/, 'Telefone WhatsApp inválido')
    .optional(),
  whatsappBusinessId: z.string().optional(),
  plan: z.enum(['STANDARD', 'ENTERPRISE', 'PARTNER']).optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED']).default('TRIAL').optional(),
});

/**
 * Schema para criação de condomínio (wizard de onboarding)
 */
export const CreateCondominiumSchema = CondominiumSchema.pick({
  name: true,
  cnpj: true,
  address: true,
  towers: true,
  whatsappPhone: true,
});

/**
 * Schema para atualização de condomínio
 */
export const UpdateCondominiumSchema = CondominiumSchema.partial().required({ id: true });

/**
 * Schema para configuração de WhatsApp
 */
export const ConfigureWhatsAppSchema = z.object({
  condominiumId: z.string().cuid(),
  whatsappPhone: z.string().regex(/^55\d{10,11}$/, 'Telefone inválido'),
  verificationCode: z.string().length(6, 'Código de verificação deve ter 6 dígitos'),
});

/**
 * Schema para importação de estrutura (torres/andares/unidades)
 */
export const ImportStructureSchema = z.object({
  condominiumId: z.string().cuid(),
  structure: z.array(
    z.object({
      tower: z.string(),
      floors: z.array(z.string()),
      unitsPerFloor: z.number().int().min(1).max(20), // Ex: 4 unidades por andar
    })
  ).min(1, 'Estrutura vazia'),
});

// Types inferidos
export type CondominiumInput = z.infer<typeof CondominiumSchema>;
export type CreateCondominiumInput = z.infer<typeof CreateCondominiumSchema>;
export type UpdateCondominiumInput = z.infer<typeof UpdateCondominiumSchema>;
export type ConfigureWhatsAppInput = z.infer<typeof ConfigureWhatsAppSchema>;
export type ImportStructureInput = z.infer<typeof ImportStructureSchema>;
