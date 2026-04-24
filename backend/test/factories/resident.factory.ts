import { faker } from "@faker-js/faker";
import { ResidentType } from "@prisma/client";
import { getTestPrisma } from "../helpers/db";
import { makeCondominium } from "./condominium.factory";

export type MakeResidentOverrides = Partial<{
  condominiumId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  tower: string;
  floor: string;
  unit: string;
  type: ResidentType;
  consentWhatsapp: boolean;
  consentDataProcessing: boolean;
}>;

export const makeResident = async (overrides: MakeResidentOverrides = {}) => {
  const p = getTestPrisma();
  const condominiumId =
    overrides.condominiumId ?? (await makeCondominium()).id;

  return p.resident.create({
    data: {
      condominiumId,
      userId: overrides.userId ?? null,
      name: overrides.name ?? faker.person.fullName(),
      email:
        overrides.email ??
        faker.internet.email({ provider: "test.local" }).toLowerCase(),
      phone: overrides.phone ?? faker.phone.number(),
      tower: overrides.tower ?? faker.helpers.arrayElement(["A", "B", "C"]),
      floor: overrides.floor ?? String(faker.number.int({ min: 1, max: 20 })),
      unit:
        overrides.unit ??
        `${faker.number.int({ min: 1, max: 4 })}${faker.number.int({ min: 0, max: 9 })}${faker.string.alphanumeric(3)}`,
      type: overrides.type ?? ResidentType.OWNER,
      consentWhatsapp: overrides.consentWhatsapp ?? true,
      consentDataProcessing: overrides.consentDataProcessing ?? true,
    },
  });
};
