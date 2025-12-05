import { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireCondoAccess } from "../middlewares/index.js";

interface CondominiumStructure {
  towers: Array<{
    name: string;
    floors: string[];
    unitsPerFloor: number;
  }>;
}

export const structureRoutes: FastifyPluginAsync = async (fastify) => {
  // =====================================================
  // GET /structure/:condominiumId
  // Get condominium structure
  // =====================================================
  fastify.get(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess({ paramName: "condominiumId" })],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };

      const condominium = await prisma.condominium.findUnique({
        where: { id: condominiumId },
        select: {
          id: true,
          name: true,
          structure: true,
        },
      });

      if (!condominium) {
        return reply.status(404).send({ error: "Condomínio não encontrado" });
      }

      return reply.send({
        condominiumId: condominium.id,
        condominiumName: condominium.name,
        structure: condominium.structure || { towers: [] },
      });
    }
  );

  // =====================================================
  // PATCH /structure/:condominiumId
  // Update condominium structure
  // =====================================================
  fastify.patch(
    "/:condominiumId",
    {
      onRequest: [fastify.authenticate, requireCondoAccess({ paramName: "condominiumId" })],
    },
    async (request, reply) => {
      const { condominiumId } = request.params as { condominiumId: string };
      const body = request.body as { structure: CondominiumStructure };

      // Validação básica
      if (!body.structure || !Array.isArray(body.structure.towers)) {
        return reply.status(400).send({ 
          error: "Estrutura inválida. Esperado: { towers: [...] }" 
        });
      }

      // Validar cada torre
      for (const tower of body.structure.towers) {
        if (!tower.name || !Array.isArray(tower.floors) || !tower.unitsPerFloor) {
          return reply.status(400).send({ 
            error: "Torre inválida. Cada torre precisa ter name, floors e unitsPerFloor" 
          });
        }
      }

      try {
        const condominium = await prisma.condominium.update({
          where: { id: condominiumId },
          data: {
            structure: body.structure as any,
          },
          select: {
            id: true,
            name: true,
            structure: true,
          },
        });

        fastify.log.info(`Structure updated for condominium ${condominiumId}`);

        return reply.send({
          condominiumId: condominium.id,
          condominiumName: condominium.name,
          structure: condominium.structure,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ 
          error: "Erro ao atualizar estrutura do condomínio" 
        });
      }
    }
  );
};

