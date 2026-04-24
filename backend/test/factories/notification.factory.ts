import { faker } from "@faker-js/faker";
import type { Prisma } from "@prisma/client";
import { getTestPrisma } from "../helpers/db";
import { makeUser } from "./user.factory";

export type MakeNotificationOverrides = Partial<{
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Prisma.InputJsonValue | null;
  read: boolean;
}>;

export const makeNotification = async (
  overrides: MakeNotificationOverrides = {}
) => {
  const p = getTestPrisma();
  const userId = overrides.userId ?? (await makeUser()).id;

  return p.notification.create({
    data: {
      userId,
      type: overrides.type ?? "COMPLAINT_UPDATE",
      title: overrides.title ?? faker.lorem.sentence({ min: 3, max: 6 }),
      body: overrides.body ?? faker.lorem.paragraph(),
      data: overrides.data ?? undefined,
      read: overrides.read ?? false,
    },
  });
};
