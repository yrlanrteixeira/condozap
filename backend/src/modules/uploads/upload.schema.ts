import { z } from "zod";

/**
 * Schema for uploading complaint attachment
 */
export const uploadComplaintAttachmentParamsSchema = z.object({
  complaintId: z.coerce.number(),
});

/**
 * Schema for uploading resident document
 */
export const uploadResidentDocumentBodySchema = z.object({
  residentId: z.string().min(1),
  documentType: z.enum(["RG", "CPF", "CNH", "COMPROVANTE_RESIDENCIA", "CONTRATO_LOCACAO", "OUTRO"]),
  documentNumber: z.string().optional(),
  observation: z.string().optional(),
});

/**
 * Schema for deleting file
 */
export const deleteFileParamsSchema = z.object({
  fileId: z.string().min(1),
});

export type UploadComplaintAttachmentParams = z.infer<typeof uploadComplaintAttachmentParamsSchema>;
export type UploadResidentDocumentBody = z.infer<typeof uploadResidentDocumentBodySchema>;
export type DeleteFileParams = z.infer<typeof deleteFileParamsSchema>;
