import { FastifyInstance } from "fastify";
import {
  uploadComplaintAttachment,
  uploadResidentDocument,
  uploadFile,
  deleteFile,
  extractFilePathFromUrl,
  BUCKETS,
} from "./upload.service";
import {
  uploadComplaintAttachmentParamsSchema,
  uploadResidentDocumentBodySchema,
} from "./upload.schema";
import { addComplaintAttachment } from "../complaints/complaints.service";
import { prisma } from "../../shared/db/prisma";
import { NotFoundError, BadRequestError } from "../../shared/errors";

const ALLOWED_MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
];
const MEDIA_BUCKET = "message-media";

export async function uploadRoutes(app: FastifyInstance) {

  /**
   * POST /uploads/media
   * Upload general media file (image/video) for messaging
   */
  app.post(
    "/media",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      if (!request.user) {
        throw new Error("Usuário não autenticado");
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
    },
    async (request, reply) => {
      const params = uploadComplaintAttachmentParamsSchema.parse(request.params);
      const { complaintId } = params;
      const user = request.user;

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Check if complaint exists
      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
      });

      if (!complaint) {
        throw new NotFoundError("Chamado não encontrado");
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
    },
    async (request, reply) => {
      const user = request.user;

      if (!user) {
        throw new Error("Usuário não autenticado");
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
        throw new Error("Você não tem permissão para enviar documentos deste morador");
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
        throw new Error("Usuário não autenticado");
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
        throw new Error("Você não tem permissão para deletar anexos");
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
        throw new Error("Usuário não autenticado");
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

      // Check authorization
      if (
        user.role === "RESIDENT" &&
        document.resident.userId !== user.id
      ) {
        throw new Error("Você não tem permissão para deletar este documento");
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
