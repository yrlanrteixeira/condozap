import { UserRole } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../test/helpers/build-test-app";
import { getTestPrisma } from "../../test/helpers/db";
import {
  makeComplaint,
  makeCondominium,
  makeSector,
  makeUser,
} from "../../test/factories";
import {
  DEFAULT_SECTOR_PERMISSIONS,
  SECTOR_COMPLAINT_PERMISSIONS,
  requireSectorComplaintPermission,
  resolveSectorMemberPermissions,
} from "./sector-permissions";

setupIntegrationSuite();

type FakeReply = FastifyReply & {
  _status: number;
  _payload: unknown;
  _sent: boolean;
};

const makeReply = (): FakeReply => {
  const reply: Partial<FakeReply> = {
    _status: 0,
    _payload: undefined,
    _sent: false,
  };
  reply.status = ((code: number) => {
    (reply as FakeReply)._status = code;
    return reply as FakeReply;
  }) as FastifyReply["status"];
  reply.send = ((payload: unknown) => {
    (reply as FakeReply)._payload = payload;
    (reply as FakeReply)._sent = true;
    return reply as FakeReply;
  }) as FastifyReply["send"];
  return reply as FakeReply;
};

const makeRequest = (overrides: {
  user?: { id: string; role: string } | undefined;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
} = {}): FastifyRequest =>
  ({
    user: overrides.user,
    params: overrides.params ?? {},
    body: overrides.body ?? {},
  } as unknown as FastifyRequest);

describe("sector-permissions constants", () => {
  it("DEFAULT_SECTOR_PERMISSIONS is a subset of SECTOR_COMPLAINT_PERMISSIONS", () => {
    for (const key of DEFAULT_SECTOR_PERMISSIONS) {
      expect(SECTOR_COMPLAINT_PERMISSIONS).toContain(key);
    }
  });
});

describe("resolveSectorMemberPermissions", () => {
  it("returns sector permissions plus granted overrides minus revoked overrides", async () => {
    const p = getTestPrisma();
    const sector = await makeSector();
    const user = await makeUser();
    const sm = await p.sectorMember.create({
      data: { sectorId: sector.id, userId: user.id, isActive: true },
    });
    await p.sectorPermission.createMany({
      data: [
        { sectorId: sector.id, action: "view:complaints" },
        { sectorId: sector.id, action: "comment:complaint" },
      ],
    });
    await p.sectorMemberPermissionOverride.createMany({
      data: [
        {
          sectorMemberId: sm.id,
          action: "resolve:complaint",
          granted: true,
        },
        {
          sectorMemberId: sm.id,
          action: "comment:complaint",
          granted: false,
        },
      ],
    });
    const perms = await resolveSectorMemberPermissions(p, sm.id, sector.id);
    expect(perms.has("view:complaints")).toBe(true);
    expect(perms.has("resolve:complaint")).toBe(true);
    expect(perms.has("comment:complaint")).toBe(false);
  });

  it("returns an empty set when no sector permissions and no overrides exist", async () => {
    const p = getTestPrisma();
    const sector = await makeSector();
    const user = await makeUser();
    const sm = await p.sectorMember.create({
      data: { sectorId: sector.id, userId: user.id, isActive: true },
    });
    const perms = await resolveSectorMemberPermissions(p, sm.id, sector.id);
    expect(perms.size).toBe(0);
  });
});

describe("requireSectorComplaintPermission middleware", () => {
  it("no-op when no user", async () => {
    const reply = makeReply();
    await requireSectorComplaintPermission("view:complaints")(
      makeRequest(),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("no-op when role is not SETOR_MEMBER", async () => {
    const reply = makeReply();
    await requireSectorComplaintPermission("view:complaints")(
      makeRequest({ user: { id: "u-1", role: "SYNDIC" } }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("400 when the complaint id is not numeric", async () => {
    const reply = makeReply();
    await requireSectorComplaintPermission("view:complaints")(
      makeRequest({
        user: { id: "u-1", role: "SETOR_MEMBER" },
        params: { id: "abc" },
      }),
      reply
    );
    expect(reply._status).toBe(400);
  });

  it("403 when the complaint has no sector", async () => {
    const complaint = await makeComplaint();
    const reply = makeReply();
    await requireSectorComplaintPermission("view:complaints")(
      makeRequest({
        user: { id: "u-1", role: "SETOR_MEMBER" },
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({ error: "Ocorrência sem setor" });
  });

  it("403 when user is not a member of the complaint's sector", async () => {
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });
    const reply = makeReply();
    await requireSectorComplaintPermission("view:complaints")(
      makeRequest({
        user: { id: u.id, role: "SETOR_MEMBER" },
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({
      error: "Você não pertence a este setor",
    });
  });

  it("403 when user lacks the primary permission", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
        permissionMode: "ROLE_DEFAULT",
      },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: u.id, isActive: true },
    });
    // No sectorPermission rows → effective perms is empty (ROLE_DEFAULT + sectors empty ∩ ceiling = [])
    // Actually ROLE_DEFAULT with sms.length>0 AND empty sector perms → intersect ceiling ∩ [] = []
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });
    const reply = makeReply();
    await requireSectorComplaintPermission("view:complaints")(
      makeRequest({
        user: { id: u.id, role: "SETOR_MEMBER" },
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({
      error: "Sem permissão para: view:complaints",
    });
  });

  it("passes when user has the primary permission", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
      },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: u.id, isActive: true },
    });
    await p.sectorPermission.create({
      data: { sectorId: sector.id, action: "view:complaints" },
    });
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });
    const reply = makeReply();
    await requireSectorComplaintPermission("view:complaints")(
      makeRequest({
        user: { id: u.id, role: "SETOR_MEMBER" },
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("update:complaint_status with body.status=RESOLVED requires resolve:complaint", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
      },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: u.id, isActive: true },
    });
    // Grant update:complaint_status but NOT resolve:complaint
    await p.sectorPermission.create({
      data: { sectorId: sector.id, action: "update:complaint_status" },
    });
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });
    const reply = makeReply();
    await requireSectorComplaintPermission("update:complaint_status")(
      makeRequest({
        user: { id: u.id, role: "SETOR_MEMBER" },
        params: { id: String(complaint.id) },
        body: { status: "RESOLVED" },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({
      error: "Sem permissão para: resolve:complaint",
    });
  });

  it("update:complaint_status with body.status=RETURNED requires return:complaint (passes when granted)", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
      },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: u.id, isActive: true },
    });
    await p.sectorPermission.createMany({
      data: [
        { sectorId: sector.id, action: "update:complaint_status" },
        { sectorId: sector.id, action: "return:complaint" },
      ],
    });
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });
    const reply = makeReply();
    await requireSectorComplaintPermission("update:complaint_status")(
      makeRequest({
        user: { id: u.id, role: "SETOR_MEMBER" },
        params: { id: String(complaint.id) },
        body: { status: "RETURNED" },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("update:complaint_status without body.status does not require extra permission", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
      },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: u.id, isActive: true },
    });
    await p.sectorPermission.create({
      data: { sectorId: sector.id, action: "update:complaint_status" },
    });
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });
    const reply = makeReply();
    await requireSectorComplaintPermission("update:complaint_status")(
      makeRequest({
        user: { id: u.id, role: "SETOR_MEMBER" },
        params: { id: String(complaint.id) },
        body: {},
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("update:complaint_status with an unknown status does not require extra permission", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
      },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: u.id, isActive: true },
    });
    await p.sectorPermission.create({
      data: { sectorId: sector.id, action: "update:complaint_status" },
    });
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });
    const reply = makeReply();
    await requireSectorComplaintPermission("update:complaint_status")(
      makeRequest({
        user: { id: u.id, role: "SETOR_MEMBER" },
        params: { id: String(complaint.id) },
        body: { status: "IN_PROGRESS" },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });
});
