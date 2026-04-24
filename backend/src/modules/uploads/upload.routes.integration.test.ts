import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeComplaint,
  makeCondominium,
  makeResident,
  makeUser,
} from "../../../test/factories";

setupIntegrationSuite();

const asAuth = (u: Awaited<ReturnType<typeof makeUser>>) => ({
  id: u.id,
  email: u.email,
  role: u.role as string,
  name: u.name,
  status: u.status,
  permissionScope: "LOCAL",
});

describe("upload routes — auth + validation", () => {
  describe("GET /api/uploads/media-proxy", () => {
    it("returns 401 when unauthenticated", async () => {
      const app = await getTestApp();
      const res = await app.inject({
        method: "GET",
        url: "/api/uploads/media-proxy?url=https://x",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 400 when url query is missing", async () => {
      const app = await getTestApp();
      const caller = await makeUser({ role: UserRole.SYNDIC });
      const res = await authedInject(app, asAuth(caller), {
        method: "GET",
        url: "/api/uploads/media-proxy",
      });
      expect(res.statusCode).toBe(400);
    });

  });

  describe("POST /api/uploads/media", () => {
    it("returns 401 when unauthenticated", async () => {
      const app = await getTestApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/uploads/media",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/uploads/complaints/:complaintId/attachments", () => {
    it("returns 401 when unauthenticated", async () => {
      const app = await getTestApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/uploads/complaints/1/attachments",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 404 when complaint does not exist", async () => {
      const app = await getTestApp();
      const caller = await makeUser({ role: UserRole.SYNDIC });
      const res = await authedInject(app, asAuth(caller), {
        method: "POST",
        url: "/api/uploads/complaints/999999/attachments",
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /api/uploads/documents", () => {
    it("returns 401 when unauthenticated", async () => {
      const app = await getTestApp();
      const res = await app.inject({
        method: "POST",
        url: "/api/uploads/documents",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("DELETE /api/uploads/complaints/attachments/:attachmentId", () => {
    it("returns 401 when unauthenticated", async () => {
      const app = await getTestApp();
      const res = await app.inject({
        method: "DELETE",
        url: "/api/uploads/complaints/attachments/abc",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 404 when attachment does not exist", async () => {
      const app = await getTestApp();
      const caller = await makeUser({ role: UserRole.SYNDIC });
      const res = await authedInject(app, asAuth(caller), {
        method: "DELETE",
        url: "/api/uploads/complaints/attachments/no-such-id",
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 403 for RESIDENT role", async () => {
      const app = await getTestApp();
      const condo = await makeCondominium();
      const resident = await makeUser({
        role: UserRole.RESIDENT,
        condominiumId: condo.id,
      });
      const syndic = await makeUser({ role: UserRole.SYNDIC });

      const complaint = await makeComplaint({ condominiumId: condo.id });
      const att = await getTestPrisma().complaintAttachment.create({
        data: {
          complaintId: complaint.id,
          fileUrl:
            "https://mock-storage.local/complaint-attachments/x/y.png",
          fileName: "y.png",
          fileType: "image/png",
          fileSize: 10,
        },
      });

      const res = await authedInject(app, asAuth(resident), {
        method: "DELETE",
        url: `/api/uploads/complaints/attachments/${att.id}`,
      });
      expect(res.statusCode).toBe(403);
    });

    it("deletes attachment when caller is SYNDIC", async () => {
      const app = await getTestApp();
      const condo = await makeCondominium();
      const syndic = await makeUser({ role: UserRole.SYNDIC });
      const complaint = await makeComplaint({ condominiumId: condo.id });
      const att = await getTestPrisma().complaintAttachment.create({
        data: {
          complaintId: complaint.id,
          fileUrl:
            "https://mock-storage.local/complaint-attachments/x/y.png",
          fileName: "y.png",
          fileType: "image/png",
          fileSize: 10,
        },
      });

      const res = await authedInject(app, asAuth(syndic), {
        method: "DELETE",
        url: `/api/uploads/complaints/attachments/${att.id}`,
      });
      expect(res.statusCode).toBe(200);
      const stillThere = await getTestPrisma().complaintAttachment.findUnique({
        where: { id: att.id },
      });
      expect(stillThere).toBeNull();
    });
  });

  describe("DELETE /api/uploads/documents/:documentId", () => {
    it("returns 401 when unauthenticated", async () => {
      const app = await getTestApp();
      const res = await app.inject({
        method: "DELETE",
        url: "/api/uploads/documents/abc",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 404 when document does not exist", async () => {
      const app = await getTestApp();
      const caller = await makeUser({ role: UserRole.SYNDIC });
      const res = await authedInject(app, asAuth(caller), {
        method: "DELETE",
        url: "/api/uploads/documents/no-such-id",
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 403 when RESIDENT tries to delete other resident's document", async () => {
      const app = await getTestApp();
      const condo = await makeCondominium();
      const ownerUser = await makeUser({
        role: UserRole.RESIDENT,
        condominiumId: condo.id,
      });
      const otherUser = await makeUser({
        role: UserRole.RESIDENT,
        condominiumId: condo.id,
      });
      const ownerResident = await makeResident({
        condominiumId: condo.id,
        userId: ownerUser.id,
      });

      const doc = await getTestPrisma().residentDocument.create({
        data: {
          residentId: ownerResident.id,
          type: "RG",
          fileUrl:
            "https://mock-storage.local/resident-documents/c/r/doc.pdf",
          status: "PENDING",
        },
      });

      const res = await authedInject(app, asAuth(otherUser), {
        method: "DELETE",
        url: `/api/uploads/documents/${doc.id}`,
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
