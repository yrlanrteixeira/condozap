import { FastifyBaseLogger } from "fastify";
import { uploadFileToStorage, deleteFileFromStorage } from "../../shared/db/supabase";
import { BadRequestError } from "../../shared/errors";
import crypto from "crypto";
import path from "path";

/**
 * Allowed file types for complaints
 */
const ALLOWED_COMPLAINT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
  "audio/wav",
];

/**
 * Allowed file types for documents
 */
const ALLOWED_DOCUMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
];

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Storage buckets
 */
export const BUCKETS = {
  COMPLAINTS: "complaint-attachments",
  DOCUMENTS: "resident-documents",
} as const;

interface UploadFileParams {
  fileBuffer: Buffer;
  filename: string;
  mimetype: string;
  bucketName: string;
  folder?: string;
  allowedTypes: string[];
}

/**
 * Generate a unique filename
 */
function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const hash = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

/**
 * Validate file type
 */
function validateFileType(mimetype: string, allowedTypes: string[]): void {
  if (!allowedTypes.includes(mimetype)) {
    throw new BadRequestError(
      `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.join(", ")}`
    );
  }
}

/**
 * Validate file size
 */
function validateFileSize(fileSize: number, maxSize: number = MAX_FILE_SIZE): void {
  if (fileSize > maxSize) {
    throw new BadRequestError(
      `Arquivo muito grande. Tamanho máximo: ${maxSize / 1024 / 1024}MB`
    );
  }
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  logger: FastifyBaseLogger,
  params: UploadFileParams
): Promise<{ publicUrl: string; filename: string; fileSize: number }> {
  const { fileBuffer, filename, mimetype, bucketName, folder, allowedTypes } = params;

  // Validate file type
  validateFileType(mimetype, allowedTypes);

  // Validate file size
  validateFileSize(fileBuffer.length);

  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(filename);
  const filePath = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

  try {
    // Upload to Supabase Storage
    const { publicUrl } = await uploadFileToStorage({
      bucketName,
      filePath,
      fileBuffer,
      contentType: mimetype,
    });

    logger.info({ filePath, bucketName }, "File uploaded successfully");

    return {
      publicUrl,
      filename: uniqueFilename,
      fileSize: fileBuffer.length,
    };
  } catch (error) {
    logger.error({ error, filePath, bucketName }, "Failed to upload file");
    throw new Error("Falha ao fazer upload do arquivo");
  }
}

/**
 * Upload complaint attachment
 */
export async function uploadComplaintAttachment(
  logger: FastifyBaseLogger,
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  condominiumId: string
): Promise<{ publicUrl: string; filename: string; fileSize: number }> {
  return uploadFile(logger, {
    fileBuffer,
    filename,
    mimetype,
    bucketName: BUCKETS.COMPLAINTS,
    folder: condominiumId,
    allowedTypes: ALLOWED_COMPLAINT_TYPES,
  });
}

/**
 * Upload resident document
 */
export async function uploadResidentDocument(
  logger: FastifyBaseLogger,
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
  condominiumId: string,
  residentId: string
): Promise<{ publicUrl: string; filename: string; fileSize: number }> {
  return uploadFile(logger, {
    fileBuffer,
    filename,
    mimetype,
    bucketName: BUCKETS.DOCUMENTS,
    folder: `${condominiumId}/${residentId}`,
    allowedTypes: ALLOWED_DOCUMENT_TYPES,
  });
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  logger: FastifyBaseLogger,
  bucketName: string,
  filePath: string
): Promise<void> {
  try {
    await deleteFileFromStorage({ bucketName, filePath });
    logger.info({ filePath, bucketName }, "File deleted successfully");
  } catch (error) {
    logger.error({ error, filePath, bucketName }, "Failed to delete file");
    throw new Error("Falha ao deletar arquivo");
  }
}

/**
 * Extract file path from public URL
 */
export function extractFilePathFromUrl(publicUrl: string, bucketName: string): string {
  // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const urlParts = publicUrl.split(`/object/public/${bucketName}/`);
  if (urlParts.length < 2) {
    throw new Error("Invalid public URL");
  }
  return urlParts[1];
}
