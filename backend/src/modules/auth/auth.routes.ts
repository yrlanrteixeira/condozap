import { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../../shared/db/prisma";
import {
  loginSchema,
  registerSchema,
  type LoginBody,
  type RegisterBody,
} from "./auth.schemas";
import type { AuthUser } from "../../types/auth";

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

    const userRole = body.role || "RESIDENT";
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: userRole,
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

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    return reply.send({
      user,
      token,
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

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      residentId: user.resident?.id,
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
      user: {
        ...userWithoutPassword,
        condominiums: userCondominiums,
        residentId: resident?.id,
      },
      token,
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
};

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}

export async function setupAuthDecorators(fastify: any) {
  fastify.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "Unauthorized" });
    }
  });
}
