/**
 * Regression test for the duplicate-attachment bug.
 *
 * The previous implementation persisted attachments twice on complaint
 * creation: once via Prisma nested create, then again via a redundant
 * loop. This suite asserts that exactly N attachments are written for
 * an N-attachment payload.
 */
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeCondominium, makeResident } from "../../../test/factories";
import { createComplaint } from "./complaints.service";

setupIntegrationSuite();

const silentLogger: any = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

describe("createComplaint — attachments", () => {
  it("persists exactly N attachments for an N-item payload (no duplication)", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const resident = await makeResident({ condominiumId: condo.id });

    const attachments = [
      {
        fileUrl: "https://cdn.test/a.png",
        fileName: "a.png",
        fileType: "image/png",
        fileSize: 1024,
      },
      {
        fileUrl: "https://cdn.test/b.pdf",
        fileName: "b.pdf",
        fileType: "application/pdf",
        fileSize: 2048,
      },
    ];

    const complaint = await createComplaint(prisma, silentLogger, {
      condominiumId: condo.id,
      residentId: resident.id,
      category: "manutencao",
      content: "Teste de anexos sem duplicação",
      priority: "MEDIUM",
      isAnonymous: false,
      attachments,
    } as any);

    const rows = await prisma.complaintAttachment.findMany({
      where: { complaintId: complaint.id },
    });

    expect(rows).toHaveLength(attachments.length);

    const urls = rows.map((r) => r.fileUrl).sort();
    expect(urls).toEqual(attachments.map((a) => a.fileUrl).sort());
  });

  it("creates zero attachments when payload omits them", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const resident = await makeResident({ condominiumId: condo.id });

    const complaint = await createComplaint(prisma, silentLogger, {
      condominiumId: condo.id,
      residentId: resident.id,
      category: "manutencao",
      content: "Sem anexos",
      priority: "MEDIUM",
      isAnonymous: false,
    } as any);

    const count = await prisma.complaintAttachment.count({
      where: { complaintId: complaint.id },
    });

    expect(count).toBe(0);
  });
});
