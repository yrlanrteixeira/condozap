import { z } from "zod";

export const residentTypeEnum = z.enum(["OWNER", "TENANT"]);

export const createResidentSchema = z.object({
  condominiumId: z.string().min(1),
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(11),
  tower: z.string().min(1),
  floor: z.string().min(1),
  unit: z.string().min(1),
  type: residentTypeEnum.optional().default("OWNER"),
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
  type: residentTypeEnum.optional(),
  consentWhatsapp: z.boolean().optional(),
  consentDataProcessing: z.boolean().optional(),
});

export const residentFiltersSchema = z.object({
  condominiumId: z.string().optional(),
  tower: z.string().optional(),
  floor: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
});

export const residentIdParamSchema = z.object({
  id: z.string().min(1),
});

export const condominiumIdParamSchema = z.object({
  condominiumId: z.string().min(1),
});

export const updateConsentSchema = z.object({
  consent_whatsapp: z.boolean().optional(),
  consent_data_processing: z.boolean().optional(),
  consentWhatsapp: z.boolean().optional(),
  consentDataProcessing: z.boolean().optional(),
}).refine(
  (data) =>
    data.consent_whatsapp !== undefined ||
    data.consent_data_processing !== undefined ||
    data.consentWhatsapp !== undefined ||
    data.consentDataProcessing !== undefined,
  { message: "Pelo menos um campo de consentimento deve ser fornecido" }
);

export const importResidentsSchema = z.object({
  condominiumId: z.string().min(1),
  residents: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(11),
      tower: z.string().min(1),
      floor: z.string().min(1),
      unit: z.string().min(1),
      type: residentTypeEnum.optional(),
    })
  ).min(1, "Pelo menos um morador deve ser fornecido"),
});

export type ResidentType = z.infer<typeof residentTypeEnum>;
export type CreateResidentRequest = z.infer<typeof createResidentSchema>;
export type UpdateResidentRequest = z.infer<typeof updateResidentSchema>;
export type ResidentFilters = z.infer<typeof residentFiltersSchema>;
export type UpdateConsentRequest = z.infer<typeof updateConsentSchema>;
export type ImportResidentsRequest = z.infer<typeof importResidentsSchema>;

