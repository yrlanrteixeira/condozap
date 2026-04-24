import { faker } from "@faker-js/faker";
import { ComplaintPriority, ComplaintStatus } from "@prisma/client";
import { getTestPrisma } from "../helpers/db";
import { makeCondominium } from "./condominium.factory";
import { makeResident } from "./resident.factory";

export type MakeComplaintOverrides = Partial<{
  condominiumId: string;
  residentId: string;
  sectorId: string | null;
  assigneeId: string | null;
  category: string;
  content: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  isAnonymous: boolean;
  requestKey: string | null;
}>;

export const makeComplaint = async (overrides: MakeComplaintOverrides = {}) => {
  const p = getTestPrisma();

  let condominiumId = overrides.condominiumId;
  let residentId = overrides.residentId;

  if (!condominiumId && !residentId) {
    const condo = await makeCondominium();
    condominiumId = condo.id;
    const resident = await makeResident({ condominiumId });
    residentId = resident.id;
  } else if (!residentId) {
    const resident = await makeResident({ condominiumId });
    residentId = resident.id;
  } else if (!condominiumId) {
    const resident = await p.resident.findUniqueOrThrow({
      where: { id: residentId },
    });
    condominiumId = resident.condominiumId;
  }

  return p.complaint.create({
    data: {
      condominiumId: condominiumId!,
      residentId: residentId!,
      sectorId: overrides.sectorId ?? null,
      assigneeId: overrides.assigneeId ?? null,
      category: overrides.category ?? "manutencao",
      content: overrides.content ?? faker.lorem.paragraph(),
      status: overrides.status ?? ComplaintStatus.TRIAGE,
      priority: overrides.priority ?? ComplaintPriority.MEDIUM,
      isAnonymous: overrides.isAnonymous ?? false,
      requestKey:
        overrides.requestKey !== undefined
          ? overrides.requestKey
          : faker.string.uuid(),
    },
  });
};
