import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(3),
  role: z
    .enum([
      "SUPER_ADMIN",
      "PROFESSIONAL_SYNDIC",
      "ADMIN",
      "SYNDIC",
      "TRIAGE",
      "SETOR_MANAGER",
      "SETOR_MEMBER",
      "RESIDENT",
    ])
    .optional(),
  requestedCondominiumId: z.string().optional(),
  requestedTower: z.string().optional(),
  requestedFloor: z.string().optional(),
  requestedUnit: z.string().optional(),
  requestedPhone: z.string().optional(),
  consentWhatsapp: z.boolean().refine((value) => value === true, {
    message:
      "Você deve aceitar receber notificações via WhatsApp para se cadastrar",
  }),
  consentDataProcessing: z.boolean().default(true),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(3).optional(),
  consentWhatsapp: z.boolean().optional(),
  consentDataProcessing: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z.string().min(8, "Nova senha deve ter no mínimo 8 caracteres"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "As senhas não coincidem",
    path: ["confirmNewPassword"],
  });

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
