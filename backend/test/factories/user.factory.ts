import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { PermissionScope, UserRole, UserStatus } from "@prisma/client";
import { getTestPrisma } from "../helpers/db";

export type MakeUserOverrides = Partial<{
  email: string;
  name: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  permissionScope: PermissionScope;
  consentWhatsapp: boolean;
  consentDataProcessing: boolean;
  approvedAt: Date | null;
  approvedBy: string | null;
  requestedCondominiumId: string | null;
  contactPhone: string | null;
}>;

export const makeUser = async (overrides: MakeUserOverrides = {}) => {
  const p = getTestPrisma();
  const plain = overrides.password ?? "test-password-123";
  return p.user.create({
    data: {
      email:
        overrides.email ??
        faker.internet.email({ provider: "test.local" }).toLowerCase(),
      name: overrides.name ?? faker.person.fullName(),
      password: await bcrypt.hash(plain, 4),
      role: overrides.role ?? UserRole.RESIDENT,
      status: overrides.status ?? UserStatus.APPROVED,
      permissionScope: overrides.permissionScope ?? PermissionScope.LOCAL,
      consentWhatsapp: overrides.consentWhatsapp ?? true,
      consentDataProcessing: overrides.consentDataProcessing ?? true,
      approvedAt: overrides.approvedAt ?? new Date(),
      approvedBy: overrides.approvedBy ?? null,
      requestedCondominiumId: overrides.requestedCondominiumId ?? null,
      contactPhone: overrides.contactPhone ?? null,
    },
  });
};
