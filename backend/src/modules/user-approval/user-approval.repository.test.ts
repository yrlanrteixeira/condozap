import { describe, expect, it } from "vitest";
import { findPendingUsersByCondominiumIds } from "./user-approval.repository";

describe("user-approval.repository — unit", () => {
  it("findPendingUsersByCondominiumIds returns [] early when list is empty", async () => {
    const prisma = {
      user: {
        findMany: () => Promise.reject(new Error("should not be called")),
      },
    } as any;
    const result = await findPendingUsersByCondominiumIds(prisma, []);
    expect(result).toEqual([]);
  });
});
