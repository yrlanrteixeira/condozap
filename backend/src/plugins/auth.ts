import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ForbiddenError } from '../shared/errors/errors';

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
      const query = request.query as Record<string, string>;
      if (!request.headers.authorization && query?.token) {
        request.headers.authorization = `Bearer ${query.token}`;
      }
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token',
      });
      return;
    }
    if (request.user.status === "SUSPENDED") {
      throw new ForbiddenError("Conta suspensa");
    }
  });
};

export default fp(authPlugin);

