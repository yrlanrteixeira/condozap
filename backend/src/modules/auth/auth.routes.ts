import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../../shared/db/prisma";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  type LoginBody,
  type RegisterBody,
  type UpdateProfileBody,
  type ChangePasswordBody,
  type RefreshTokenBody,
} from "./auth.schemas";
import type { AuthUser } from "../../types/auth";
import { config } from "../../config/env";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body) as RegisterBody;

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const userRole = (body.role || "RESIDENT") as string;
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: userRole as any,
        status: userRole === "RESIDENT" ? "PENDING" : "APPROVED",
        requestedCondominiumId: body.requestedCondominiumId,
        requestedTower: body.requestedTower,
        requestedFloor: body.requestedFloor,
        requestedUnit: body.requestedUnit,
        requestedPhone: body.requestedPhone,
        consentWhatsapp: body.consentWhatsapp,
        consentDataProcessing: body.consentDataProcessing,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        permissionScope: true,
        requestedTower: true,
        requestedFloor: true,
        requestedUnit: true,
        createdAt: true,
      },
    });

    const token = fastify.jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name,
        permissionScope: user.permissionScope,
      },
      { expiresIn: config.JWT_EXPIRES_IN || "7d" }
    );

    const refreshToken = fastify.jwt.sign(
      { id: user.id, type: "refresh" },
      { expiresIn: "30d" }
    );

    return reply.send({
      user,
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

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.name,
      permissionScope: user.permissionScope,
      residentId: user.resident?.id,
    };

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

    return reply.send({
      user: {
        ...userWithoutPassword,
        condominiums: userCondominiums,
        residentId: resident?.id,
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
      }));

      return reply.send({
        ...userWithoutPassword,
        condominiums: userCondominiums,
        residentId: resident?.id,
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
      if (body.name !== undefined) updateData.name = body.name;
      if (body.consentWhatsapp !== undefined)
        updateData.consentWhatsapp = body.consentWhatsapp;
      if (body.consentDataProcessing !== undefined)
        updateData.consentDataProcessing = body.consentDataProcessing;

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

      return reply.send({
        ...userWithoutPassword,
        condominiums: userCondominiums,
        residentId: resident?.id,
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

      const token = fastify.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          name: user.name,
          permissionScope: user.permissionScope,
          residentId: user.resident?.id,
        },
        { expiresIn: config.JWT_EXPIRES_IN || "7d" }
      );

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
        data: { password: hashedPassword },
      });

      return reply.send({ message: "Senha alterada com sucesso" });
    }
  );
};

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}
