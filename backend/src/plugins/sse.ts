import type { FastifyInstance } from "fastify";

interface SSEConnection {
  reply: any;
  userId: string;
  condominiumId?: string;
}

const connections = new Map<string, SSEConnection>();

const ssePlugin = async (fastify: FastifyInstance) => {
  // Registrar rota SSE
  fastify.get("/sse", { config: { raw: true } }, async (request, reply) => {
    // Headers CORS para SSE
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
    });

    // Tentar obter user do JWT auth ou via token na query
    let userId: string | null = null;
    
    // 1. Se já tem user autenticado (via JWT)
    const authUser = (request.user as any)?.id;
    if (authUser) {
      userId = authUser;
    } else {
      // 2. Tentar via token na query param
      const query = request.query as Record<string, string>;
      const token = query?.token;
      if (token && fastify.jwt) {
        try {
          const payload = fastify.jwt.verify<{ sub?: string; id?: string }>(token);
          userId = payload.sub || payload.id || null;
        } catch (e) {
          // Token inválido
        }
      }
    }

    if (!userId) {
      reply.raw.end("Unauthorized");
      return;
    }

    const query = request.query as Record<string, string>;
    const condoId = query?.condominiumId;

    const key = `user:${userId}`;
    connections.set(key, { reply: reply.raw, userId, condominiumId: condoId });

    // Keep-alive heartbeat
    const heartbeat = setInterval(() => {
      reply.raw.write(`: heartbeat\n\n`);
    }, 25000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      connections.delete(key);
    });
  });
};

export default ssePlugin;

// Enviar notification para um usuário específico
export function sendSSENotification(userId: string, event: string, data: any) {
  const key = `user:${userId}`;
  const conn = connections.get(key);
  
  if (conn?.reply) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    conn.reply.write(message);
  }
}

// Enviar para todos os usuários de um condomínio
export function broadcastToCondominium(condominiumId: string, event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  
  for (const conn of connections.values()) {
    if (conn.condominiumId === condominiumId || conn.condominiumId === undefined) {
      conn.reply?.write(message);
    }
  }
}

// Contar conexões ativas (para debug)
export function getSSEConnectionCount(): number {
  return connections.size;
}