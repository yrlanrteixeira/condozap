import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Authentication Plugin
 * Adds authenticate decorator to Fastify instance
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      if (request.user.status === "SUSPENDED") {
        reply.code(403).send({ error: "Conta suspensa" });
        return;
      }
    } catch (err) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token',
      });
    }
  });
};

export default fp(authPlugin);

