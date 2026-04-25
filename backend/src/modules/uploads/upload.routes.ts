import { FastifyInstance } from "fastify";
import {
  uploadComplaintAttachment,
  uploadResidentDocument,
  uploadFile,
  deleteFile,
  extractFilePathFromUrl,
  getFile,
  BUCKETS,
} from "./upload.service";
import {
  uploadComplaintAttachmentParamsSchema,
  uploadResidentDocumentBodySchema,
} from "./upload.schema";
import { addComplaintAttachment } from "../complaints/complaints.service";
import { prisma } from "../../shared/db/prisma";
import { NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError } from "../../shared/errors";
import { resolveAccessContext, isCondominiumAllowed } from "../../auth/context";
import type { AuthUser } from "../../types/auth";

async function getAccessCtx(user: AuthUser) {
  return resolveAccessContext(prisma, {
    id: user.id,
    role: user.role as any,
    permissionScope: user.permissionScope as any,
  });
}

/**
 * Extracts the condominiumId from a stored object URL.
 * Storage layout: <endpoint>/<bucket>/<condominiumId>/<rest...>
 * Returns null if the URL does not match the expected layout for the bucket.
 */
function extractCondominiumIdFromUrl(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const tail = url.substring(idx + marker.length);
  const firstSegment = tail.split("/")[0];
  return firstSegment || null;
}

const ALLOWED_MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
];
const MEDIA_BUCKET = "message-media";

export async function uploadRoutes(app: FastifyInstance) {

  /**
   * GET /uploads/media-proxy?url=<encoded-url>
   * Proxy to fetch media files that require authentication
   */
  app.get(
    "/media-proxy",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const url = (request.query as { url?: string }).url;
      if (!url) {
        throw new BadRequestError("URL é obrigatória");
      }

      try {
        // Detect bucket from URL
        let bucket = MEDIA_BUCKET;
        if (url.includes("/complaint-attachments/")) bucket = "complaint-attachments";
        else if (url.includes("/resident-documents/")) bucket = "resident-documents";

        // Cross-condo isolation: derive condominiumId from URL path and
        // validate against caller's access context. message-media (chat
        // media) is not necessarily condo-scoped today; we only enforce
        // the check for complaint-attachments and resident-documents.
        if (
          bucket === "complaint-attachments" ||
          bucket === "resident-documents"
        ) {
          const user = request.user as AuthUser | undefined;
          if (!user) throw new UnauthorizedError();
          const condoId = extractCondominiumIdFromUrl(url, bucket);
          if (!condoId) {
            throw new BadRequestError("URL do objeto inválida");
          }
          const ctx = await getAccessCtx(user);
          if (!isCondominiumAllowed(ctx, condoId)) {
            throw new ForbiddenError("Acesso negado ao condomínio do arquivo");
          }
        }

        const { data, contentType } = await getFile(app.log, bucket, url);

        reply.header("Content-Type", contentType);
        reply.header("Cache-Control", "public, max-age=3600");

        return reply.send(data);
      } catch (err) {
        // Preserve auth/permission failures so they don't get masked as 404s.
        // Check by AppError statusCode rather than instanceof to be resilient
        // to module-instance duplication under vitest module reloads.
        const code = (err as any)?.statusCode;
        if (code === 401 || code === 403 || code === 400) {
          throw err;
        }
        const message = err instanceof Error ? err.message : "Erro ao baixar arquivo";
        throw new NotFoundError(message);
      }
    }
  );

  /**
   * POST /uploads/media
   * Upload general media file (image/video) for messaging
   */
  app.post(
    "/media",
    {
      onRequest: [app.authenticate],
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new UnauthorizedError();
      }

      const data = await request.file();
      if (!data) {
        throw new BadRequestError("Nenhum arquivo foi enviado");
      }

      const fileBuffer = await data.toBuffer();

      const { publicUrl } = await uploadFile(app.log, {
        fileBuffer,
        filename: data.filename,
        mimetype: data.mimetype,
        bucketName: MEDIA_BUCKET,
        allowedTypes: ALLOWED_MEDIA_TYPES,
      });

      return reply.code(201).send({ url: publicUrl, mimeType: data.mimetype });
    }
  );

  /**
   * POST /uploads/complaints/:complaintId/attachments
   * Upload attachment to a complaint
   */
  app.post(
    "/complaints/:complaintId/attachments",
    {
      onRequest: [app.authenticate],
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const params = uploadComplaintAttachmentParamsSchema.parse(request.params);
      const { complaintId } = params;
      const user = request.user;

      if (!user) {
        throw new UnauthorizedError();
      }

      // Check if complaint exists
      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
      });

      if (!complaint) {
        throw new NotFoundError("Chamado não encontrado");
      }

      // Cross-condo isolation: ensure caller has access to the complaint's condo
      const ctx = await getAccessCtx(user as AuthUser);
      if (!isCondominiumAllowed(ctx, complaint.condominiumId)) {
        throw new ForbiddenError("Acesso negado ao condomínio do chamado");
      }

      // Get uploaded file
      const data = await request.file();

      if (!data) {
        throw new BadRequestError("Nenhum arquivo foi enviado");
      }

      const fileBuffer = await data.toBuffer();

      // Upload to Supabase Storage
      const { publicUrl, filename, fileSize } = await uploadComplaintAttachment(
        app.log,
        fileBuffer,
        data.filename,
        data.mimetype,
        complaint.condominiumId
      );

      // Save attachment to database
      const attachment = await addComplaintAttachment(
        prisma,
        complaintId,
        {
          fileUrl: publicUrl,
          fileName: filename,
          fileType: data.mimetype,
          fileSize,
        },
        user.id
      );

      return reply.code(201).send({
        success: true,
        data: attachment,
      });
    }
  );

  /**
   * POST /uploads/documents
   * Upload resident document
   */
  app.post(
    "/documents",
    {
      onRequest: [app.authenticate],
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const user = request.user;

      if (!user) {
        throw new UnauthorizedError();
      }

      // Parse multipart data
      const parts = request.parts();
      let fileData: any = null;
      let metadata: any = {};

      for await (const part of parts) {
        if (part.type === "file") {
          fileData = part;
        } else {
          // @ts-ignore
          metadata[part.fieldname] = part.value;
        }
      }

      if (!fileData) {
        throw new BadRequestError("Nenhum arquivo foi enviado");
      }

      // Validate metadata
      const validatedData = uploadResidentDocumentBodySchema.parse(metadata);

      // Check if resident exists
      const resident = await prisma.resident.findUnique({
        where: { id: validatedData.residentId },
      });

      if (!resident) {
        throw new NotFoundError("Morador não encontrado");
      }

      // Check authorization
      if (
        user.role === "RESIDENT" &&
        resident.userId !== user.id
      ) {
        throw new ForbiddenError("Você não tem permissão para enviar documentos deste morador");
      }

      // Upload to Supabase Storage
      const fileBuffer = await fileData.toBuffer();
      const { publicUrl } = await uploadResidentDocument(
        app.log,
        fileBuffer,
        fileData.filename,
        fileData.mimetype,
        resident.condominiumId,
        resident.id
      );

      // Save document to database
      const document = await prisma.residentDocument.create({
        data: {
          residentId: resident.id,
          type: validatedData.documentType,
          number: validatedData.documentNumber,
          observation: validatedData.observation,
          fileUrl: publicUrl,
          status: "PENDING",
        },
      });

      return reply.code(201).send({
        success: true,
        data: document,
      });
    }
  );

  /**
   * DELETE /uploads/complaints/attachments/:attachmentId
   * Delete complaint attachment
   */
  app.delete(
    "/complaints/attachments/:attachmentId",
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { attachmentId } = request.params as { attachmentId: string };
      const user = request.user;

      if (!user) {
        throw new UnauthorizedError();
      }

      // Get attachment
      const attachment = await prisma.complaintAttachment.findUnique({
        where: { id: attachmentId },
        include: {
          complaint: true,
        },
      });

      if (!attachment) {
        throw new NotFoundError("Anexo não encontrado");
      }

      // Check authorization (only admins can delete)
      if (!["ADMIN", "SYNDIC", "PROFESSIONAL_SYNDIC"].includes(user.role)) {
        throw new ForbiddenError("Você não tem permissão para deletar anexos");
      }

      // Cross-condo isolation: ensure caller has access to the attachment's
      // complaint condo (no SUPER_ADMIN bypass — SA is platform operator).
      const ctx = await getAccessCtx(user as AuthUser);
      if (!isCondominiumAllowed(ctx, attachment.complaint.condominiumId)) {
        throw new ForbiddenError("Acesso negado ao condomínio do anexo");
      }

      // Extract file path from URL
      const filePath = extractFilePathFromUrl(attachment.fileUrl, BUCKETS.COMPLAINTS);

      // Delete from storage
      await deleteFile(app.log, BUCKETS.COMPLAINTS, filePath);

      // Delete from database
      await prisma.complaintAttachment.delete({
        where: { id: attachmentId },
      });

      return reply.code(200).send({
        success: true,
        message: "Anexo deletado com sucesso",
      });
    }
  );

  /**
   * DELETE /uploads/documents/:documentId
   * Delete resident document
   */
  app.delete(
    "/documents/:documentId",
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };
      const user = request.user;

      if (!user) {
        throw new UnauthorizedError();
      }

      // Get document
      const document = await prisma.residentDocument.findUnique({
        where: { id: documentId },
        include: {
          resident: true,
        },
      });

      if (!document) {
        throw new NotFoundError("Documento não encontrado");
      }

      // Cross-condo isolation: ALL roles must pass the condo check now.
      // Previously the bypass only checked ownership for RESIDENT, leaving
      // ADMIN/SYNDIC of one condo able to delete documents in another condo.
      const ctx = await getAccessCtx(user as AuthUser);
      if (!isCondominiumAllowed(ctx, document.resident.condominiumId)) {
        throw new ForbiddenError("Acesso negado ao condomínio do documento");
      }

      // RESIDENT must additionally be the owner of the resident profile.
      if (
        user.role === "RESIDENT" &&
        document.resident.userId !== user.id
      ) {
        throw new ForbiddenError("Você não tem permissão para deletar este documento");
      }

      if (!document.fileUrl) {
        throw new BadRequestError("Documento não possui arquivo");
      }

      // Extract file path from URL
      const filePath = extractFilePathFromUrl(document.fileUrl, BUCKETS.DOCUMENTS);

      // Delete from storage
      await deleteFile(app.log, BUCKETS.DOCUMENTS, filePath);

      // Delete from database
      await prisma.residentDocument.delete({
        where: { id: documentId },
      });

      return reply.code(200).send({
        success: true,
        message: "Documento deletado com sucesso",
      });
    }
  );
}
