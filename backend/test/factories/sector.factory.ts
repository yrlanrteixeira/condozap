import { faker } from "@faker-js/faker";
import { getTestPrisma } from "../helpers/db";
import { makeCondominium } from "./condominium.factory";

export type MakeSectorOverrides = Partial<{
  condominiumId: string;
  name: string;
  categories: string[];
  allowedForwardingIds: string[];
}>;

export const makeSector = async (overrides: MakeSectorOverrides = {}) => {
  const p = getTestPrisma();
  const condominiumId =
    overrides.condominiumId ?? (await makeCondominium()).id;

  return p.sector.create({
    data: {
      condominiumId,
      name:
        overrides.name ??
        `${faker.commerce.department()}-${faker.string.alphanumeric(4)}`,
      categories:
        overrides.categories ?? ["manutencao", "limpeza", "seguranca"],
      allowedForwardingIds: overrides.allowedForwardingIds ?? [],
    },
  });
};
