import { describe, expect, it, vi } from "vitest";
import {
  approveUser,
  rejectUser,
  getPendingUsersForMyCondominiums,
  getPendingUsersByCondominium,
} from "./user-approval.service";
import * as repo from "./user-approval.repository";

const fakePrisma = {} as any;

describe("user-approval.service — unit (error branches)", () => {
  it("approveUser throws when condominium not found", async () => {
    vi.spyOn(repo, "findPendingUserById").mockResolvedValue({
      id: "u1",
      status: "PENDING",
      name: "x",
      email: "x@x",
      requestedPhone: "",
      consentWhatsapp: false,
      consentDataProcessing: false,
      requestedCondominiumId: null,
    } as any);
    vi.spyOn(repo, "findCondominiumById").mockResolvedValue(null);

    await expect(
      approveUser(fakePrisma, { id: "s1", role: "SYNDIC" } as any, {
        userId: "u1",
        condominiumId: "nope",
        tower: "A",
        floor: "1",
        unit: "1",
      } as any)
    ).rejects.toThrow(/Condomínio não encontrado/);
  });

  it("rejectUser throws for non-syndic role (defence in depth)", async () => {
    vi.spyOn(repo, "findPendingUserById").mockResolvedValue({
      id: "u1",
      status: "PENDING",
      requestedCondominiumId: null,
    } as any);

    await expect(
      rejectUser(fakePrisma, { id: "r", role: "RESIDENT" } as any, {
        userId: "u1",
        reason: "x",
      })
    ).rejects.toThrow(/Acesso negado/);
  });

  it("getPendingUsersForMyCondominiums throws for RESIDENT", async () => {
    await expect(
      getPendingUsersForMyCondominiums(fakePrisma, {
        id: "r",
        role: "RESIDENT",
      } as any)
    ).rejects.toThrow(/Acesso negado/);
  });

  it("getPendingUsersByCondominium throws for RESIDENT", async () => {
    await expect(
      getPendingUsersByCondominium(fakePrisma, "c1", {
        id: "r",
        role: "RESIDENT",
      } as any)
    ).rejects.toThrow(/Acesso negado/);
  });
});
