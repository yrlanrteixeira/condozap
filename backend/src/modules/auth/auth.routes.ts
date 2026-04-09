import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../../shared/db/prisma";
import { BadRequestError } from "../../shared/errors";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  completeFirstPasswordSchema,
  type LoginBody,
  type RegisterBody,
  type UpdateProfileBody,
  type ChangePasswordBody,
  type RefreshTokenBody,
  type CompleteFirstPasswordBody,
} from "./auth.schemas";
import type { AuthUser } from "../../types/auth";
import { config } from "../../config/env";
import { normalizeCondominiumSlug } from "../../shared/utils/condominium-slug";
import { buildAccessTokenPayload } from "./auth-jwt-payload";
import { registerResidentWithInvite } from "./register-invite.service";
import { userToApi } from "./user-response";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body) as RegisterBody;

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const userRole = (body.role || "RESIDENT") as string;

    let requestedCondominiumId: string | undefined;
    if (body.requestedCondominiumSlug?.trim()) {
      const slug = normalizeCondominiumSlug(body.requestedCondominiumSlug);
      const condo = await prisma.condominium.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });
      if (!condo) {
        return reply.status(400).send({
          error:
            "Condomínio não encontrado. Use o link de cadastro enviado pelo seu condomínio.",
        });
      }
      if (condo.status === "SUSPENDED") {
        return reply.status(400).send({
          error:
            "Este condomínio não está aceitando novos cadastros no momento.",
        });
      }
      requestedCondominiumId = condo.id;
    }

    if (
      body.inviteToken?.trim() &&
      userRole === "RESIDENT" &&
      !requestedCondominiumId
    ) {
      return reply.status(400).send({
        error: "Abra o cadastro pelo link do seu condomínio (slug na URL).",
      });
    }

    const userWithInvite =
      body.inviteToken?.trim() && userRole === "RESIDENT"
        ? await registerResidentWithInvite({
            prisma,
            body,
            hashedPassword,
            condominiumIdFromSlug: requestedCondominiumId!,
          })
        : null;

    if (userWithInvite) {
      const tokenPayload = buildAccessTokenPayload({
        ...userWithInvite,
        residentId: userWithInvite.resident?.id,
      });
      const token = fastify.jwt.sign(tokenPayload, {
        expiresIn: config.JWT_EXPIRES_IN || "7d",
      });
      const refreshToken = fastify.jwt.sign(
        { id: userWithInvite.id, type: "refresh" },
        { expiresIn: "30d" }
      );
      const u = userToApi(userWithInvite, {
        residentId: userWithInvite.resident?.id,
      });
      return reply.send({
        user: u,
        token,
        refreshToken,
        isPending: userWithInvite.status === "PENDING",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: "User already exists" });
    }

    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: userRole as any,
        status: userRole === "RESIDENT" ? "PENDING" : "APPROVED",
        requestedCondominiumId,
        requestedTower: body.requestedTower,
        requestedFloor: body.requestedFloor,
        requestedUnit: body.requestedUnit,
        requestedPhone: body.requestedPhone,
        consentWhatsapp: body.consentWhatsapp,
        consentDataProcessing: body.consentDataProcessing,
      },
      include: { resident: true },
    });

    const tokenPayload = buildAccessTokenPayload({
      ...user,
      residentId: user.resident?.id,
    });
    const token = fastify.jwt.sign(tokenPayload, {
      expiresIn: config.JWT_EXPIRES_IN || "7d",
    });

    const refreshToken = fastify.jwt.sign(
      { id: user.id, type: "refresh" },
      { expiresIn: "30d" }
    );

    const u = userToApi(user, { residentId: user.resident?.id });

    return reply.send({
      user: u,
      token,
      refreshToken,
      isPending: user.status === "PENDING",
    });
  });

  fastify.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body) as LoginBody;

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        condominiums: {
          include: {
            condominium: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        resident: true,
      },
    });

    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(body.password, user.password);

    if (!validPassword) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    if (user.status === "SUSPENDED") {
      throw new BadRequestError("Conta suspensa. Entre em contato com o administrador do condomínio.");
    }

    const tokenPayload = buildAccessTokenPayload({
      ...user,
      residentId: user.resident?.id,
      forcePasswordReset: user.forcePasswordReset,
    });

    const token = fastify.jwt.sign(tokenPayload, {
      expiresIn: config.JWT_EXPIRES_IN || "7d",
    });

    const refreshToken = fastify.jwt.sign(
      { id: user.id, type: "refresh" },
      { expiresIn: "30d" }
    );

    const {
      password: _,
      condominiums,
      resident,
      ...userWithoutPassword
    } = user;

    const userCondominiums = condominiums.map((uc) => ({
      id: uc.condominium.id,
      name: uc.condominium.name,
    }));

    const u = userToApi(userWithoutPassword as Parameters<typeof userToApi>[0], {
      residentId: resident?.id,
    });

    return reply.send({
      user: {
        ...u,
        condominiums: userCondominiums,
      },
      token,
      refreshToken,
      isPending: user.status === "PENDING",
    });
  });

  fastify.get(
    "/me",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = (request.user as AuthUser).id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          condominiums: {
            include: {
              condominium: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          resident: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      const {
        password: _,
        condominiums,
        resident,
        ...userWithoutPassword
      } = user;

      const userCondominiums = condominiums.map((uc) => ({
        id: uc.condominium.id,
        name: uc.condominium.name,
        role: uc.role,
        councilPosition: uc.councilPosition,
        assignedTower: uc.assignedTower,
      }));

      // Resolve sector data for SETOR_MEMBER/SETOR_MANAGER
      let sectors: any[] = [];
      if (user.role === "SETOR_MEMBER" || user.role === "SETOR_MANAGER") {
        const sectorMemberships = await prisma.sectorMember.findMany({
          where: { userId: user.id, isActive: true },
          include: {
            sector: { select: { id: true, name: true } },
            permissionOverrides: { select: { action: true, granted: true } },
          },
        });

        for (const sm of sectorMemberships) {
          const sectorPerms = await prisma.sectorPermission.findMany({
            where: { sectorId: sm.sectorId },
            select: { action: true },
          });
          const allowed = new Set(sectorPerms.map((p) => p.action));
          for (const override of sm.permissionOverrides) {
            if (override.granted) allowed.add(override.action);
            else allowed.delete(override.action);
          }
          sectors.push({
            sectorId: sm.sector.id,
            sectorName: sm.sector.name,
            permissions: Array.from(allowed),
          });
        }
      }

      const base = userToApi(userWithoutPassword as never, {
        residentId: resident?.id,
      });

      return reply.send({
        ...base,
        condominiums: userCondominiums,
        ...(sectors.length > 0 && { sectors }),
      });
    }
  );

  fastify.patch(
    "/me",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = (request.user as AuthUser).id;
      const body = updateProfileSchema.parse(request.body) as UpdateProfileBody;

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          condominiums: {
            include: {
              condominium: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          resident: true,
        },
      });

      const {
        password: _,
        condominiums,
        resident,
        ...userWithoutPassword
      } = user;

      const userCondominiums = condominiums.map((uc) => ({
        id: uc.condominium.id,
        name: uc.condominium.name,
      }));

      const base = userToApi(userWithoutPassword as never, {
        residentId: resident?.id,
      });

      return reply.send({
        ...base,
        condominiums: userCondominiums,
      });
    }
  );

  fastify.post("/refresh", async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body) as RefreshTokenBody;

    try {
      const decoded = fastify.jwt.verify<{ id: string; type?: string }>(
        body.refreshToken
      );

      if (decoded.type !== "refresh") {
        return reply.status(401).send({ error: "Invalid refresh token" });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          condominiums: {
            include: {
              condominium: { select: { id: true, name: true } },
            },
          },
          resident: true,
        },
      });

      if (!user) {
        return reply.status(401).send({ error: "User not found" });
      }

      const tokenPayload = buildAccessTokenPayload({
        ...user,
        residentId: user.resident?.id,
        forcePasswordReset: user.forcePasswordReset,
      });

      const token = fastify.jwt.sign(tokenPayload, {
        expiresIn: config.JWT_EXPIRES_IN || "7d",
      });

      const newRefreshToken = fastify.jwt.sign(
        { id: user.id, type: "refresh" },
        { expiresIn: "30d" }
      );

      return reply.send({ token, refreshToken: newRefreshToken });
    } catch {
      return reply.status(401).send({ error: "Invalid or expired refresh token" });
    }
  });

  fastify.post("/logout", async (_request, reply) => {
    return reply.send({ message: "Logged out successfully" });
  });

  fastify.patch(
    "/change-password",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = (request.user as AuthUser).id;
      const body = changePasswordSchema.parse(request.body) as ChangePasswordBody;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return reply.status(404).send({ error: "Usuário não encontrado" });
      }

      const validPassword = await bcrypt.compare(
        body.currentPassword,
        user.password
      );

      if (!validPassword) {
        return reply
          .status(400)
          .send({ error: "Senha atual incorreta" });
      }

      const hashedPassword = await bcrypt.hash(body.newPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, forcePasswordReset: false },
      });

      return reply.send({ message: "Senha alterada com sucesso" });
    }
  );

  fastify.post(
    "/complete-first-password",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = (request.user as AuthUser).id;
      const body = completeFirstPasswordSchema.parse(
        request.body
      ) as CompleteFirstPasswordBody;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { resident: true, condominiums: { include: { condominium: true } } },
      });

      if (!user) {
        return reply.status(404).send({ error: "Usuário não encontrado" });
      }

      if (!user.forcePasswordReset) {
        return reply.status(400).send({
          error: "Esta ação não se aplica à sua conta.",
        });
      }

      const hashedPassword = await bcrypt.hash(body.newPassword, 10);

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, forcePasswordReset: false },
        include: {
          condominiums: {
            include: {
              condominium: { select: { id: true, name: true } },
            },
          },
          resident: true,
        },
      });

      const tokenPayload = buildAccessTokenPayload({
        ...updated,
        residentId: updated.resident?.id,
        forcePasswordReset: false,
      });

      const token = fastify.jwt.sign(tokenPayload, {
        expiresIn: config.JWT_EXPIRES_IN || "7d",
      });

      const refreshToken = fastify.jwt.sign(
        { id: updated.id, type: "refresh" },
        { expiresIn: "30d" }
      );

      const { password: _, condominiums, resident, ...rest } = updated;
      const userCondominiums = condominiums.map((uc) => ({
        id: uc.condominium.id,
        name: uc.condominium.name,
      }));

      const u = userToApi(rest as never, { residentId: resident?.id });

      return reply.send({
        message: "Senha definida com sucesso",
        user: { ...u, condominiums: userCondominiums },
        token,
        refreshToken,
      });
    }
  );
};

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}
