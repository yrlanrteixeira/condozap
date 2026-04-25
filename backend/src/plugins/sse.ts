import type { FastifyInstance } from "fastify";
import { verifySseTicket } from "../modules/auth/sse-ticket";

interface SSEConnection {
  reply: any;
  userId: string;
  condominiumId?: string;
  channels?: string[];
}

const connections = new Map<string, SSEConnection>();

/**
 * Channel-only subscriptions (e.g. `complaint:123`).
 * Each channel maps to a Set of raw `reply` writers.
 */
const channelConnections = new Map<string, Set<any>>();

/**
 * Subscribe a raw response stream to a named channel. Returns an
 * unsubscribe function that cleans up the entry safely.
 */
export function subscribeToChannel(channel: string, replyRaw: any): () => void {
  let set = channelConnections.get(channel);
  if (!set) {
    set = new Set();
    channelConnections.set(channel, set);
  }
  set.add(replyRaw);
  return () => {
    const current = channelConnections.get(channel);
    if (!current) return;
    current.delete(replyRaw);
    if (current.size === 0) channelConnections.delete(channel);
  };
}

export function getChannelSubscriberCount(channel: string): number {
  return channelConnections.get(channel)?.size ?? 0;
}

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

    // Authentication priority for the SSE stream:
    //   1. Bearer header (preferred — does not appear in logs/Referer)
    //   2. Short-lived ticket (?ticket=) — issued via POST /api/auth/sse-ticket
    //   3. Long-lived JWT (?token=) — DEPRECATED, kept for backward compat
    //      until the frontend migrates fully to tickets. A WARN is logged so
    //      we can track residual usage and remove this branch later.
    let userId: string | null = null;

    const authUser = (request.user as any)?.id;
    if (authUser) {
      userId = authUser;
    } else {
      const query = request.query as Record<string, string>;
      const ticket = query?.ticket;
      const token = query?.token;

      if (ticket && fastify.jwt) {
        const result = verifySseTicket(fastify.jwt, ticket);
        if (result) userId = result.userId;
      }

      if (!userId && token && fastify.jwt) {
        try {
          const payload = fastify.jwt.verify<{ sub?: string; id?: string }>(token);
          userId = payload.sub || payload.id || null;
          if (userId) {
            request.log.warn(
              { userId },
              "sse: long-lived JWT in query (deprecated) — frontend should use /api/auth/sse-ticket"
            );
          }
        } catch {
          // invalid token
        }
      }
    }

    if (!userId) {
      reply.raw.end("Unauthorized");
      return;
    }

    const query = request.query as Record<string, string>;
    const condoId = query?.condominiumId;
    const channels = query?.channels?.split(",").filter(Boolean) || [];

    const key = `user:${userId}`;
    connections.set(key, { reply: reply.raw, userId, condominiumId: condoId, channels });

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
  // Check if it's a channel (contains :)
  if (userId.includes(":")) {
    broadcastToChannel(userId, event, data);
    return;
  }
  
  const key = `user:${userId}`;
  const conn = connections.get(key);
  
  if (conn?.reply) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    conn.reply.write(message);
  }
}

// Broadcast to a specific channel (e.g., "complaint:123")
export function broadcastToChannel(channel: string, event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  // 1. Channel-only subscribers (per-resource streams like complaint chat)
  const channelSet = channelConnections.get(channel);
  if (channelSet) {
    for (const reply of channelSet) {
      try {
        reply.write(message);
      } catch {
        // socket already closed; subscription cleanup handled by 'close'
      }
    }
  }

  // 2. User-level connections that opted into this channel via query param
  for (const conn of connections.values()) {
    const userChannels = conn.channels || [];
    if (userChannels.includes(channel)) {
      conn.reply?.write(message);
    }
  }
}

// Enviar para todos os usuários de um condomínio.
// SECURITY: only deliver to connections that explicitly subscribed to the
// same condominiumId. Connections without an explicit condominiumId
// (e.g. SUPER_ADMIN dashboards, multi-condo users) MUST NOT receive
// per-condominium broadcasts — they would otherwise see events from any
// condo on the platform.
export function broadcastToCondominium(condominiumId: string, event: string, data: any) {
  if (!condominiumId) return;
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const conn of connections.values()) {
    if (conn.condominiumId && conn.condominiumId === condominiumId) {
      conn.reply?.write(message);
    }
  }
}

// Contar conexões ativas (para debug)
export function getSSEConnectionCount(): number {
  return connections.size;
}