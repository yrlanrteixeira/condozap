import { faker } from "@faker-js/faker";
import { CondominiumStatus } from "@prisma/client";
import { getTestPrisma } from "../helpers/db";

export type MakeCondominiumOverrides = Partial<{
  name: string;
  slug: string;
  cnpj: string;
  status: CondominiumStatus;
  primarySyndicId: string | null;
  whatsappPhone: string | null;
  whatsappBusinessId: string | null;
  structure: unknown;
  autoTriageEnabled: boolean;
  autoAssignEnabled: boolean;
}>;

const randomCnpj = (): string =>
  faker.string.numeric(14);

export const makeCondominium = async (
  overrides: MakeCondominiumOverrides = {}
) => {
  const p = getTestPrisma();
  const name = overrides.name ?? `${faker.company.name()} Condo`;
  return p.condominium.create({
    data: {
      name,
      slug:
        overrides.slug ??
        `${faker.helpers.slugify(name).toLowerCase()}-${faker.string.alphanumeric(6).toLowerCase()}`,
      cnpj: overrides.cnpj ?? randomCnpj(),
      status: overrides.status ?? CondominiumStatus.ACTIVE,
      primarySyndicId: overrides.primarySyndicId ?? null,
      whatsappPhone: overrides.whatsappPhone ?? null,
      whatsappBusinessId: overrides.whatsappBusinessId ?? null,
      structure: (overrides.structure as never) ?? undefined,
      autoTriageEnabled: overrides.autoTriageEnabled ?? true,
      autoAssignEnabled: overrides.autoAssignEnabled ?? true,
    },
  });
};
