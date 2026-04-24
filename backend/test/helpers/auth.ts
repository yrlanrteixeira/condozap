import type { FastifyInstance, InjectOptions } from "fastify";
import type { UserRole } from "@prisma/client";

export type TestUserPayload = {
  id: string;
  email: string;
  role: UserRole | string;
  status?: string;
  name?: string;
  permissionScope?: string;
  residentId?: string;
  mustChangePassword?: boolean;
};

export const signAsUser = (
  app: FastifyInstance,
  user: TestUserPayload
): string => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status ?? "ACTIVE",
    name: user.name ?? "Test User",
    permissionScope: user.permissionScope ?? "CONDOMINIUM",
    mustChangePassword: user.mustChangePassword ?? false,
    ...(user.residentId ? { residentId: user.residentId } : {}),
  };
  return app.jwt.sign(payload, { expiresIn: "1h" });
};

export const authedInject = async (
  app: FastifyInstance,
  user: TestUserPayload,
  opts: InjectOptions
) => {
  const token = signAsUser(app, user);
  return app.inject({
    ...opts,
    headers: {
      ...(opts.headers ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
};
