export { listAnnouncementsHandler, createAnnouncementHandler, deleteAnnouncementHandler } from "./announcements.controller";
export * from "./announcements.schema";
export * from "./announcements.service";

// ---------------------------------------------------------------------------
// Backward-compat shim used by condominiums.routes.ts (legacy route shape).
// The old handler read `:id` as the condominium ID; the new one reads
// `:condominiumId`.  This thin wrapper adapts the param name.
// ---------------------------------------------------------------------------
import type { FastifyRequest, FastifyReply } from "fastify";
import { listAnnouncementsHandler } from "./announcements.controller";

export async function getAnnouncementsByCondominiumHandler(
  request: FastifyRequest<{ Params: { id: string }; Querystring: Record<string, string> }>,
  reply: FastifyReply
) {
  // Re-use the new handler by injecting the expected param name
  (request.params as any).condominiumId = (request.params as any).id;
  return listAnnouncementsHandler(request as any, reply);
}
