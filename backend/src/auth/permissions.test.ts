import { describe, expect, it } from "vitest";
import { TicketActions, rolePermissions, roleCanExecute } from "./permissions";
import { Roles } from "./roles";

describe("TicketActions constant", () => {
  it("has every expected action key", () => {
    expect(TicketActions).toEqual({
      VIEW_TICKET: "view_ticket",
      UPDATE_TICKET: "update_ticket",
      ASSIGN_TICKET: "assign_ticket",
      PAUSE_RESUME_SLA: "pause_resume_sla",
      UPLOAD_ATTACHMENT: "upload_attachment",
      TRIAGE: "triage",
    });
  });
});

describe("rolePermissions matrix", () => {
  it("SUPER_ADMIN has no ticket permissions", () => {
    expect(rolePermissions[Roles.SUPER_ADMIN]).toEqual([]);
  });

  it("PROFESSIONAL_SYNDIC / ADMIN / SYNDIC get every action", () => {
    const allActions = Object.values(TicketActions).sort();
    for (const role of [
      Roles.PROFESSIONAL_SYNDIC,
      Roles.ADMIN,
      Roles.SYNDIC,
    ]) {
      expect([...rolePermissions[role]].sort()).toEqual(allActions);
    }
  });

  it("SETOR_MEMBER cannot ASSIGN or TRIAGE", () => {
    expect(rolePermissions[Roles.SETOR_MEMBER]).not.toContain(
      TicketActions.ASSIGN_TICKET
    );
    expect(rolePermissions[Roles.SETOR_MEMBER]).not.toContain(
      TicketActions.TRIAGE
    );
  });

  it("RESIDENT can only view and upload", () => {
    expect(rolePermissions[Roles.RESIDENT]).toEqual([
      TicketActions.VIEW_TICKET,
      TicketActions.UPLOAD_ATTACHMENT,
    ]);
  });
});

describe("roleCanExecute", () => {
  it("returns true when the role has the action", () => {
    expect(roleCanExecute(Roles.SYNDIC, TicketActions.TRIAGE)).toBe(true);
  });

  it("returns false when the role lacks the action", () => {
    expect(roleCanExecute(Roles.RESIDENT, TicketActions.TRIAGE)).toBe(false);
  });

  it("returns false for an unknown role", () => {
    // Force-cast to exercise the nullish branch
    expect(
      roleCanExecute("UNKNOWN" as never, TicketActions.VIEW_TICKET)
    ).toBe(false);
  });
});
