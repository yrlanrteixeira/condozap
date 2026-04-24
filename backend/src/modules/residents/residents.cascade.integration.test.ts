/**
 * Regression test for the resident-cascade bug.
 *
 * Previously, Complaint.resident had ON DELETE CASCADE — a raw resident
 * delete would silently destroy the complaints log. The schema now
 * declares ON DELETE RESTRICT; deleting a resident with complaints
 * must fail at the database level (defense in depth, in addition to the
 * service-layer 409 guard).
 */
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../../test/helpers/build-test-app";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeComplaint, makeCondominium, makeResident } from "../../../test/factories";

setupIntegrationSuite();

describe("FK: Complaint.resident ON DELETE RESTRICT", () => {
  it("Postgres rejects deleting a resident that has complaints", async () => {
    const prisma = getTestPrisma();
    const complaint = await makeComplaint();

    await expect(
      prisma.resident.delete({ where: { id: complaint.residentId } })
    ).rejects.toThrow();

    const stillThere = await prisma.complaint.findUnique({
      where: { id: complaint.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("a resident with no complaints can still be deleted", async () => {
    const prisma = getTestPrisma();
    const condo = await makeCondominium();
    const resident = await makeResident({ condominiumId: condo.id });

    await expect(
      prisma.resident.delete({ where: { id: resident.id } })
    ).resolves.toMatchObject({ id: resident.id });
  });
});
