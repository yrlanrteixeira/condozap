import { z } from "zod";

export const createResidentSchema = z.object({
  condominiumId: z.string().min(1),
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(11),
  tower: z.string().min(1),
  floor: z.string().min(1),
  unit: z.string().min(1),
  type: z.enum(["OWNER", "TENANT"]).optional().default("OWNER"),
  consentWhatsapp: z.boolean().optional().default(true),
  consentDataProcessing: z.boolean().optional().default(true),
});

export const updateResidentSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(11).optional(),
  tower: z.string().optional(),
  floor: z.string().optional(),
  unit: z.string().optional(),
  type: z.enum(["OWNER", "TENANT"]).optional(),
  consentWhatsapp: z.boolean().optional(),
  consentDataProcessing: z.boolean().optional(),
});

export type CreateResidentSchema = z.infer<typeof createResidentSchema>;
export type UpdateResidentSchema = z.infer<typeof updateResidentSchema>;
