import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(3),
  role: z
    .enum(["SUPER_ADMIN", "PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC", "RESIDENT"])
    .optional(),
  // Dados para aprovação (obrigatórios para RESIDENT)
  requestedCondominiumId: z.string().optional(),
  requestedTower: z.string().optional(),
  requestedFloor: z.string().optional(),
  requestedUnit: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register
  fastify.post("/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create user
    const userRole = body.role || "RESIDENT";
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: userRole,
        // Admins/Syndics are auto-approved, Residents need approval
        status: userRole === "RESIDENT" ? "PENDING" : "APPROVED",
        // Store requested allocation for residents
        requestedCondominiumId: body.requestedCondominiumId,
        requestedTower: body.requestedTower,
        requestedFloor: body.requestedFloor,
        requestedUnit: body.requestedUnit,
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

    // Generate JWT
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

  // Login
  fastify.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find user
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
      },
    });

    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    // Verify password
    const validPassword = await bcrypt.compare(body.password, user.password);

    if (!validPassword) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    // Return user without password
    const { password: _, condominiums, ...userWithoutPassword } = user;

    // Transform condominiums for response
    const userCondominiums = condominiums.map((uc) => ({
      id: uc.condominium.id,
      name: uc.condominium.name,
    }));

    return reply.send({
      user: {
        ...userWithoutPassword,
        condominiums: userCondominiums,
      },
      token,
      isPending: user.status === "PENDING",
    });
  });

  // Get current user (requires authentication)
  fastify.get(
    "/me",
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = (request.user as any).id;

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
        },
      });

      if (!user) {
        return reply.status(404).send({ error: "User not found" });
      }

      // Remove password and transform condominiums
      const { password: _, condominiums, ...userWithoutPassword } = user;

      const userCondominiums = condominiums.map((uc) => ({
        id: uc.condominium.id,
        name: uc.condominium.name,
      }));

      return reply.send({
        ...userWithoutPassword,
        condominiums: userCondominiums,
      });
    }
  );
};

// JWT authentication decorator
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
