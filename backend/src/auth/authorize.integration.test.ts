import {
  CondominiumPermissionMode,
  ComplaintStatus,
  UserRole,
} from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { setupIntegrationSuite } from "../../test/helpers/build-test-app";
import { getTestPrisma } from "../../test/helpers/db";
import {
  makeComplaint,
  makeCondominium,
  makeResident,
  makeSector,
  makeUser,
} from "../../test/factories";
import type { AuthUser } from "../types/auth";
import {
  requireAdmin,
  requireAttachmentUpload,
  requireComplaintOwner,
  requireComplaintOwnerAction,
  requireCondoAccess,
  requireCondoAccessUnlessSuperAdmin,
  requireCondoPermission,
  requireCondoPermissionAny,
  requireCondoPermissionFromComplaint,
  requireGlobalScope,
  requirePauseOrResume,
  requireRole,
  requireSuperAdmin,
  requireSuperAdminOrGlobalProfessionalSyndic,
  requireSyndicStrict,
  requireTicketAssign,
  requireTicketModify,
  requireTicketView,
  requireTriage,
} from "./authorize";

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
  user?: Partial<AuthUser> | undefined;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
} = {}): FastifyRequest => {
  return {
    user: overrides.user as AuthUser | undefined,
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    body: overrides.body ?? {},
  } as unknown as FastifyRequest;
};

const user = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: overrides.id ?? "u-1",
  email: overrides.email ?? "u@test.local",
  name: overrides.name ?? "Test",
  role: overrides.role ?? "SYNDIC",
  status: overrides.status ?? "ACTIVE",
  permissionScope: overrides.permissionScope,
  residentId: overrides.residentId,
  mustChangePassword: overrides.mustChangePassword,
});

// -------- requireRole family --------

describe("requireRole", () => {
  it("returns 401 when the request has no user", async () => {
    const reply = makeReply();
    await requireRole(["SYNDIC"])(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("returns 403 with the list of allowed roles when role is not allowed", async () => {
    const reply = makeReply();
    await requireRole(["SYNDIC", "ADMIN"])(
      makeRequest({ user: user({ role: "RESIDENT" }) }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({
      error: expect.stringContaining("SYNDIC, ADMIN"),
    });
  });

  it("allows the request through (no status set) when role matches", async () => {
    const reply = makeReply();
    await requireRole(["SYNDIC"])(
      makeRequest({ user: user({ role: "SYNDIC" }) }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("requireSuperAdmin: accepts SUPER_ADMIN, rejects others", async () => {
    const ok = makeReply();
    await requireSuperAdmin()(
      makeRequest({ user: user({ role: "SUPER_ADMIN" }) }),
      ok
    );
    expect(ok._sent).toBe(false);
    const nope = makeReply();
    await requireSuperAdmin()(
      makeRequest({ user: user({ role: "SYNDIC" }) }),
      nope
    );
    expect(nope._status).toBe(403);
  });

  it("requireAdmin / requireSyndicStrict accept the expected roles", async () => {
    const okAdmin = makeReply();
    await requireAdmin()(
      makeRequest({ user: user({ role: "ADMIN" }) }),
      okAdmin
    );
    expect(okAdmin._sent).toBe(false);

    const okStrict = makeReply();
    await requireSyndicStrict()(
      makeRequest({ user: user({ role: "SYNDIC" }) }),
      okStrict
    );
    expect(okStrict._sent).toBe(false);

    const noStrict = makeReply();
    await requireSyndicStrict()(
      makeRequest({ user: user({ role: "ADMIN" }) }),
      noStrict
    );
    expect(noStrict._status).toBe(403);
  });
});

describe("requireGlobalScope", () => {
  it("401 when no user", async () => {
    const reply = makeReply();
    await requireGlobalScope()(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("403 when scope is not GLOBAL", async () => {
    const reply = makeReply();
    await requireGlobalScope()(
      makeRequest({ user: user({ permissionScope: "LOCAL" }) }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("passes when scope is GLOBAL", async () => {
    const reply = makeReply();
    await requireGlobalScope()(
      makeRequest({ user: user({ permissionScope: "GLOBAL" }) }),
      reply
    );
    expect(reply._sent).toBe(false);
  });
});

describe("requireSuperAdminOrGlobalProfessionalSyndic", () => {
  it("401 without user", async () => {
    const reply = makeReply();
    await requireSuperAdminOrGlobalProfessionalSyndic()(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("allows PROFESSIONAL_SYNDIC with GLOBAL scope", async () => {
    const reply = makeReply();
    await requireSuperAdminOrGlobalProfessionalSyndic()(
      makeRequest({
        user: user({
          role: "PROFESSIONAL_SYNDIC",
          permissionScope: "GLOBAL",
        }),
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("denies SUPER_ADMIN (no longer eligible)", async () => {
    const reply = makeReply();
    await requireSuperAdminOrGlobalProfessionalSyndic()(
      makeRequest({ user: user({ role: "SUPER_ADMIN" }) }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("denies PROFESSIONAL_SYNDIC without GLOBAL scope", async () => {
    const reply = makeReply();
    await requireSuperAdminOrGlobalProfessionalSyndic()(
      makeRequest({
        user: user({
          role: "PROFESSIONAL_SYNDIC",
          permissionScope: "LOCAL",
        }),
      }),
      reply
    );
    expect(reply._status).toBe(403);
  });
});

// -------- requireCondoAccess --------

describe("requireCondoAccess", () => {
  it("401 without user", async () => {
    const reply = makeReply();
    await requireCondoAccess()(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("400 when condominiumId is missing", async () => {
    const reply = makeReply();
    const u = await makeUser({ role: UserRole.SYNDIC });
    await requireCondoAccess()(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: {},
      }),
      reply
    );
    expect(reply._status).toBe(400);
  });

  it("403 when the user is not a member of the condominium", async () => {
    const reply = makeReply();
    const u = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium();
    await requireCondoAccess()(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({
      error: "Acesso negado ao condomínio solicitado",
    });
  });

  it("uses superAdminForbiddenMessage for SUPER_ADMIN when configured", async () => {
    const reply = makeReply();
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    const condo = await makeCondominium();
    await requireCondoAccess({
      superAdminForbiddenMessage: "Operador de plataforma: sem acesso",
    })(
      makeRequest({
        user: user({ id: u.id, role: "SUPER_ADMIN" }),
        params: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({
      error: "Operador de plataforma: sem acesso",
    });
  });

  it("allows the member user through", async () => {
    const reply = makeReply();
    const p = getTestPrisma();
    const u = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium();
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    await requireCondoAccess()(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("reads condominiumId from query when source=query", async () => {
    const reply = makeReply();
    const p = getTestPrisma();
    const u = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium();
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    await requireCondoAccess({ source: "query" })(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        query: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("reads condominiumId from body when source=body (and 400 when body is missing the key)", async () => {
    const reply = makeReply();
    const u = await makeUser({ role: UserRole.SYNDIC });
    await requireCondoAccess({ source: "body" })(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        body: {},
      }),
      reply
    );
    expect(reply._status).toBe(400);
  });

  it("requireCondoAccessUnlessSuperAdmin is an alias and behaves identically", async () => {
    const reply = makeReply();
    const u = await makeUser({ role: UserRole.SYNDIC });
    const condo = await makeCondominium();
    await requireCondoAccessUnlessSuperAdmin()(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._status).toBe(403);
  });
});

// -------- Ticket guards --------

describe("ticket guards (requireTicket*)", () => {
  it("401 without user", async () => {
    const reply = makeReply();
    await requireTicketView()(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("403 when the role cannot execute the action", async () => {
    // SUPER_ADMIN has no ticket permissions
    const u = await makeUser({ role: UserRole.SUPER_ADMIN });
    const reply = makeReply();
    await requireTicketView()(
      makeRequest({
        user: user({ id: u.id, role: "SUPER_ADMIN" }),
        params: { id: "1" },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({
      error: "Permissão insuficiente para a ação",
    });
  });

  it("400 when the ticket id is not a number", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    const reply = makeReply();
    await requireTicketView()(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { id: "abc" },
      }),
      reply
    );
    expect(reply._status).toBe(400);
  });

  it("404 when the ticket does not exist", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    const reply = makeReply();
    await requireTicketView()(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { id: "999999" },
      }),
      reply
    );
    expect(reply._status).toBe(404);
  });

  it("TRIAGE role always bypasses ticket condominium/sector checks", async () => {
    const p = getTestPrisma();
    const u = await makeUser({ role: UserRole.TRIAGE });
    const complaint = await makeComplaint();
    const reply = makeReply();
    await requireTicketView()(
      makeRequest({
        user: user({ id: u.id, role: "TRIAGE" }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
    // also exercises requireTriage helper
    const reply2 = makeReply();
    await requireTriage()(
      makeRequest({
        user: user({ id: u.id, role: "TRIAGE" }),
        params: { id: String(complaint.id) },
      }),
      reply2
    );
    expect(reply2._sent).toBe(false);
    void p;
  });

  it("403 when user is not member of the ticket's condominium (VIEW)", async () => {
    const u = await makeUser({ role: UserRole.SYNDIC });
    const complaint = await makeComplaint();
    const reply = makeReply();
    await requireTicketView()(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("RESIDENT viewing own ticket: allowed; viewing other resident's: denied", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const resident = await makeResident({ condominiumId: condo.id });
    const residentUser = await makeUser({ role: UserRole.RESIDENT });
    await p.userCondominium.create({
      data: {
        userId: residentUser.id,
        condominiumId: condo.id,
        role: UserRole.RESIDENT,
      },
    });
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
    });

    const ownReply = makeReply();
    await requireTicketView()(
      makeRequest({
        user: user({
          id: residentUser.id,
          role: "RESIDENT",
          residentId: resident.id,
        }),
        params: { id: String(complaint.id) },
      }),
      ownReply
    );
    expect(ownReply._sent).toBe(false);

    const otherReply = makeReply();
    await requireTicketView()(
      makeRequest({
        user: user({
          id: residentUser.id,
          role: "RESIDENT",
          residentId: "different-resident",
        }),
        params: { id: String(complaint.id) },
      }),
      otherReply
    );
    expect(otherReply._status).toBe(403);
  });

  it("SYNDIC of the condo can VIEW / MODIFY / ASSIGN / PAUSE", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const u = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const complaint = await makeComplaint({ condominiumId: condo.id });

    for (const guard of [
      requireTicketView(),
      requireTicketModify(),
      requireTicketAssign(),
      requirePauseOrResume(),
      requireAttachmentUpload(),
    ]) {
      const reply = makeReply();
      await guard(
        makeRequest({
          user: user({ id: u.id, role: "SYNDIC" }),
          params: { id: String(complaint.id) },
        }),
        reply
      );
      expect(reply._sent).toBe(false);
    }
  });

  it("SETOR_MEMBER can modify when member of the ticket's sector; denied if not", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const member = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: member.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
      },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: member.id, isActive: true },
    });
    const ticket = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });

    const ok = makeReply();
    await requireTicketModify()(
      makeRequest({
        user: user({ id: member.id, role: "SETOR_MEMBER" }),
        params: { id: String(ticket.id) },
      }),
      ok
    );
    expect(ok._sent).toBe(false);

    // Different sector → denied
    const otherSector = await makeSector({ condominiumId: condo.id });
    const ticketOtherSector = await makeComplaint({
      condominiumId: condo.id,
      sectorId: otherSector.id,
    });
    const nope = makeReply();
    await requireTicketModify()(
      makeRequest({
        user: user({ id: member.id, role: "SETOR_MEMBER" }),
        params: { id: String(ticketOtherSector.id) },
      }),
      nope
    );
    expect(nope._status).toBe(403);
  });

  it("SETOR_MEMBER is allowed when it is the ticket's assignee even outside their sector set", async () => {
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
    // user is NOT a sectorMember of `sector`, but is set as the assignee
    const ticket = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
      assigneeId: u.id,
    });
    const reply = makeReply();
    await requireTicketModify()(
      makeRequest({
        user: user({ id: u.id, role: "SETOR_MEMBER" }),
        params: { id: String(ticket.id) },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("RESIDENT cannot MODIFY a ticket (role is not allowed)", async () => {
    const u = await makeUser({ role: UserRole.RESIDENT });
    const complaint = await makeComplaint();
    const reply = makeReply();
    await requireTicketModify()(
      makeRequest({
        user: user({ id: u.id, role: "RESIDENT", residentId: "whatever" }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    // RESIDENT has no UPDATE_TICKET permission → early 403 from roleCanExecute
    expect(reply._status).toBe(403);
  });

  it("TRIAGE action is allowed only for syndic role; sector role is denied", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const sector = await makeSector({ condominiumId: condo.id });
    const u = await makeUser({ role: UserRole.SETOR_MANAGER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MANAGER,
      },
    });
    await p.sectorMember.create({
      data: { sectorId: sector.id, userId: u.id, isActive: true },
    });
    const ticket = await makeComplaint({
      condominiumId: condo.id,
      sectorId: sector.id,
    });
    const reply = makeReply();
    await requireTriage()(
      makeRequest({
        user: user({ id: u.id, role: "SETOR_MANAGER" }),
        params: { id: String(ticket.id) },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({ error: expect.any(String) });
  });
});

// -------- Complaint-owner guards --------

describe("requireComplaintOwner / requireComplaintOwnerAction", () => {
  it("requireComplaintOwner: 401 without user", async () => {
    const reply = makeReply();
    await requireComplaintOwner()(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("requireComplaintOwner: 403 when user is not a RESIDENT with residentId", async () => {
    const reply = makeReply();
    await requireComplaintOwner()(
      makeRequest({ user: user({ role: "SYNDIC" }), params: { id: "1" } }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("requireComplaintOwner: 404 when the complaint does not exist", async () => {
    const reply = makeReply();
    await requireComplaintOwner()(
      makeRequest({
        user: user({ role: "RESIDENT", residentId: "r-1" }),
        params: { id: "999999" },
      }),
      reply
    );
    expect(reply._status).toBe(404);
  });

  it("requireComplaintOwner: 403 when the complaint belongs to another resident", async () => {
    const complaint = await makeComplaint();
    const reply = makeReply();
    await requireComplaintOwner()(
      makeRequest({
        user: user({ role: "RESIDENT", residentId: "other" }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("requireComplaintOwner: passes when the resident owns the complaint", async () => {
    const complaint = await makeComplaint();
    const reply = makeReply();
    await requireComplaintOwner()(
      makeRequest({
        user: user({ role: "RESIDENT", residentId: complaint.residentId }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("requireComplaintOwnerAction propagates the custom error message", async () => {
    const reply = makeReply();
    await requireComplaintOwnerAction("Mensagem customizada")(
      makeRequest({
        user: user({ role: "SYNDIC" }),
        params: { id: "1" },
      }),
      reply
    );
    expect(reply._status).toBe(403);
    expect(reply._payload).toMatchObject({ error: "Mensagem customizada" });
  });

  it("requireComplaintOwnerAction: 401 without user", async () => {
    const reply = makeReply();
    await requireComplaintOwnerAction("x")(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("requireComplaintOwnerAction: 404 for missing complaint", async () => {
    const reply = makeReply();
    await requireComplaintOwnerAction("x")(
      makeRequest({
        user: user({ role: "RESIDENT", residentId: "r-1" }),
        params: { id: "999999" },
      }),
      reply
    );
    expect(reply._status).toBe(404);
  });

  it("requireComplaintOwnerAction: 403 when resident does not own the complaint", async () => {
    const complaint = await makeComplaint();
    const reply = makeReply();
    await requireComplaintOwnerAction("nope")(
      makeRequest({
        user: user({ role: "RESIDENT", residentId: "other" }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("requireComplaintOwnerAction: passes for the owning resident", async () => {
    const complaint = await makeComplaint();
    const reply = makeReply();
    await requireComplaintOwnerAction("x")(
      makeRequest({
        user: user({ role: "RESIDENT", residentId: complaint.residentId }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });
});

// -------- Condo permission guards --------

describe("requireCondoPermission", () => {
  it("401 without user", async () => {
    const reply = makeReply();
    await requireCondoPermission("view:complaints")(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("allows SUPER_ADMIN without further checks", async () => {
    const reply = makeReply();
    await requireCondoPermission("view:complaints")(
      makeRequest({ user: user({ role: "SUPER_ADMIN" }) }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("400 when condominiumId is missing", async () => {
    const reply = makeReply();
    await requireCondoPermission("view:complaints")(
      makeRequest({ user: user({ role: "SYNDIC" }), params: {} }),
      reply
    );
    expect(reply._status).toBe(400);
  });

  it("403 when user lacks the permission", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
        permissionMode: CondominiumPermissionMode.CUSTOM,
      },
    });
    const reply = makeReply();
    await requireCondoPermission("view:complaints")(
      makeRequest({
        user: user({ id: u.id, role: "SETOR_MEMBER" }),
        params: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("passes when user holds the permission (SYNDIC gets full ceiling)", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const u = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const reply = makeReply();
    await requireCondoPermission("view:complaints")(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("reads condominiumId from query/body based on config.source", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const u = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });

    const replyQuery = makeReply();
    await requireCondoPermission("view:complaints", { source: "query" })(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        query: { condominiumId: condo.id },
      }),
      replyQuery
    );
    expect(replyQuery._sent).toBe(false);

    const replyBody = makeReply();
    await requireCondoPermission("view:complaints", { source: "body" })(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        body: { condominiumId: condo.id },
      }),
      replyBody
    );
    expect(replyBody._sent).toBe(false);
  });
});

describe("requireCondoPermissionAny", () => {
  it("401 without user", async () => {
    const reply = makeReply();
    await requireCondoPermissionAny(["view:complaints"])(makeRequest(), reply);
    expect(reply._status).toBe(401);
  });

  it("allows SUPER_ADMIN", async () => {
    const reply = makeReply();
    await requireCondoPermissionAny(["x"])(
      makeRequest({ user: user({ role: "SUPER_ADMIN" }) }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("400 when condominiumId is missing", async () => {
    const reply = makeReply();
    await requireCondoPermissionAny(["x"])(
      makeRequest({ user: user({ role: "SYNDIC" }), params: {} }),
      reply
    );
    expect(reply._status).toBe(400);
  });

  it("403 when user holds none of the listed permissions", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const u = await makeUser({ role: UserRole.SETOR_MEMBER });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SETOR_MEMBER,
        permissionMode: CondominiumPermissionMode.CUSTOM,
      },
    });
    const reply = makeReply();
    await requireCondoPermissionAny(["view:complaints", "resolve:complaint"])(
      makeRequest({
        user: user({ id: u.id, role: "SETOR_MEMBER" }),
        params: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("passes when user holds at least one of the permissions", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const u = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const reply = makeReply();
    await requireCondoPermissionAny(["not:a:key", "view:complaints"])(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { condominiumId: condo.id },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("reads condominiumId from query and body", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const u = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });

    const rq = makeReply();
    await requireCondoPermissionAny(["view:complaints"], { source: "query" })(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        query: { condominiumId: condo.id },
      }),
      rq
    );
    expect(rq._sent).toBe(false);

    const rb = makeReply();
    await requireCondoPermissionAny(["view:complaints"], { source: "body" })(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        body: { condominiumId: condo.id },
      }),
      rb
    );
    expect(rb._sent).toBe(false);
  });
});

describe("requireCondoPermissionFromComplaint", () => {
  it("401 without user", async () => {
    const reply = makeReply();
    await requireCondoPermissionFromComplaint("view:complaints")(
      makeRequest(),
      reply
    );
    expect(reply._status).toBe(401);
  });

  it("allows SUPER_ADMIN", async () => {
    const reply = makeReply();
    await requireCondoPermissionFromComplaint("view:complaints")(
      makeRequest({ user: user({ role: "SUPER_ADMIN" }) }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("400 when complaintId is not numeric", async () => {
    const reply = makeReply();
    await requireCondoPermissionFromComplaint("view:complaints")(
      makeRequest({
        user: user({ role: "SYNDIC" }),
        params: { id: "abc" },
      }),
      reply
    );
    expect(reply._status).toBe(400);
  });

  it("404 when the complaint does not exist", async () => {
    const reply = makeReply();
    await requireCondoPermissionFromComplaint("view:complaints")(
      makeRequest({
        user: user({ role: "SYNDIC" }),
        params: { id: "999999" },
      }),
      reply
    );
    expect(reply._status).toBe(404);
  });

  it("403 when the user has no effective permission for the complaint's condominium", async () => {
    const complaint = await makeComplaint();
    const u = await makeUser({ role: UserRole.SYNDIC });
    const reply = makeReply();
    await requireCondoPermissionFromComplaint("view:complaints")(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._status).toBe(403);
  });

  it("passes when the SYNDIC owns the condo of the complaint", async () => {
    const p = getTestPrisma();
    const condo = await makeCondominium();
    const u = await makeUser({ role: UserRole.SYNDIC });
    await p.userCondominium.create({
      data: {
        userId: u.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const complaint = await makeComplaint({ condominiumId: condo.id });
    const reply = makeReply();
    await requireCondoPermissionFromComplaint("view:complaints")(
      makeRequest({
        user: user({ id: u.id, role: "SYNDIC" }),
        params: { id: String(complaint.id) },
      }),
      reply
    );
    expect(reply._sent).toBe(false);
  });

  it("uses custom paramName", async () => {
    const reply = makeReply();
    await requireCondoPermissionFromComplaint(
      "view:complaints",
      "complaintId"
    )(
      makeRequest({
        user: user({ role: "SYNDIC" }),
        params: { complaintId: "abc" },
      }),
      reply
    );
    expect(reply._status).toBe(400);
  });
});

// Keep a reference to ComplaintStatus to avoid unused import in future edits
void ComplaintStatus;
