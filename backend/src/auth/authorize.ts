import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../shared/db/prisma";
import { AuthUser } from "../types/auth";
import {
  AccessContext,
  resolveAccessContext,
  isCondominiumAllowed,
} from "./context";
import { roleCanExecute, TicketAction, TicketActions } from "./permissions";
import {
  Role,
  isResident,
  isSectorRole,
  isSyndic,
  isTriage,
} from "./roles";

const parseTicketId = (
  request: FastifyRequest,
  paramName = "id"
): number => Number((request.params as Record<string, string | number>)[paramName]);

const buildAccessContext = async (
  user: AuthUser
): Promise<AccessContext> =>
  resolveAccessContext(prisma, {
    id: user.id,
    role: user.role,
    permissionScope: user.permissionScope as any,
  });

const deny = (
  reply: FastifyReply,
  status: number,
  message: string
) => reply.status(status).send({ error: message });

const loadComplaint = async (ticketId: number) =>
  prisma.complaint.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      condominiumId: true,
      sectorId: true,
      assigneeId: true,
      residentId: true,
      status: true,
    },
  });

const canAccessTicket = (
  user: AuthUser,
  context: AccessContext,
  action: TicketAction,
  ticket: {
    condominiumId: string;
    sectorId: string | null;
    assigneeId: string | null;
    residentId: string;
  }
): boolean => {
  if (isTriage(user.role)) {
    return true;
  }
  if (!isCondominiumAllowed(context, ticket.condominiumId)) {
    return false;
  }
  const isResidentSelf =
    isResident(user.role) && user.residentId === ticket.residentId;
  const isSyndicRole = isSyndic(user.role);
  const isSectorMember =
    !!ticket.sectorId && context.allowedSectorIds.includes(ticket.sectorId);
  const isAssignee = ticket.assigneeId === user.id;
  if (action === TicketActions.VIEW_TICKET) {
    return (
      isResidentSelf || isSyndicRole || isSectorMember || isAssignee
    );
  }
  if (action === TicketActions.TRIAGE) {
    return isSyndicRole;
  }
  if (action === TicketActions.UPLOAD_ATTACHMENT) {
    return isResidentSelf || isSyndicRole || isSectorMember || isAssignee;
  }
  if (
    action === TicketActions.UPDATE_TICKET ||
    action === TicketActions.ASSIGN_TICKET ||
    action === TicketActions.PAUSE_RESUME_SLA
  ) {
    if (isSyndicRole) {
      return true;
    }
    if (isSectorRole(user.role)) {
      return isSectorMember || isAssignee;
    }
    return false;
  }
  return false;
};

interface CondoAccessConfig {
  paramName?: string;
  source?: "params" | "query" | "body";
}

export const requireCondoAccess = (config: CondoAccessConfig = {}) => {
  const { paramName = "condominiumId", source = "params" } = config;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;
    if (!user) {
      return deny(reply, 401, "Usuário não autenticado");
    }
    const context = await buildAccessContext(user);
    let condominiumId: string | undefined;
    if (source === "params") {
      condominiumId = (request.params as Record<string, string>)[paramName];
    } else if (source === "query") {
      condominiumId = (request.query as Record<string, string>)[paramName];
    } else {
      condominiumId = (request.body as Record<string, string>)?.[paramName];
    }
    if (!condominiumId) {
      return deny(reply, 400, `${paramName} não fornecido`);
    }
    if (!isCondominiumAllowed(context, condominiumId)) {
      return deny(reply, 403, "Acesso negado ao condomínio solicitado");
    }
  };
};

const createTicketGuard = (
  action: TicketAction,
  paramName = "id"
) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;
    if (!user) {
      return deny(reply, 401, "Usuário não autenticado");
    }
    if (!roleCanExecute(user.role as Role, action)) {
      return deny(reply, 403, "Permissão insuficiente para a ação");
    }
    const ticketId = parseTicketId(request, paramName);
    if (Number.isNaN(ticketId)) {
      return deny(reply, 400, "Identificador do ticket inválido");
    }
    const context = await buildAccessContext(user);
    const ticket = await loadComplaint(ticketId);
    if (!ticket) {
      return deny(reply, 404, "Ticket não encontrado");
    }
    if (!canAccessTicket(user, context, action, ticket)) {
      return deny(reply, 403, "Acesso negado ao ticket");
    }
  };

export const requireTicketView = (paramName = "id") =>
  createTicketGuard(TicketActions.VIEW_TICKET, paramName);

export const requireTicketModify = (paramName = "id") =>
  createTicketGuard(TicketActions.UPDATE_TICKET, paramName);

export const requireTicketAssign = (paramName = "id") =>
  createTicketGuard(TicketActions.ASSIGN_TICKET, paramName);

export const requirePauseOrResume = (paramName = "id") =>
  createTicketGuard(TicketActions.PAUSE_RESUME_SLA, paramName);

export const requireTriage = (paramName = "id") =>
  createTicketGuard(TicketActions.TRIAGE, paramName);

export const requireAttachmentUpload = (paramName = "id") =>
  createTicketGuard(TicketActions.UPLOAD_ATTACHMENT, paramName);

// =====================================================
// Role-based authorization
// =====================================================

export const requireRole = (roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;
    if (!user) {
      return deny(reply, 401, "Usuário não autenticado");
    }
    if (!roles.includes(user.role)) {
      return deny(reply, 403, `Acesso negado. Roles permitidos: ${roles.join(", ")}`);
    }
  };
};

export const requireSuperAdmin = () => requireRole(["SUPER_ADMIN"]);

// "Admin" here means "condominium admin" (síndico / conselheiro),
// NOT platform admin. SUPER_ADMIN is the platform operator and has no
// visibility into any condominium's operational data.
export const requireAdmin = () =>
  requireRole(["PROFESSIONAL_SYNDIC", "ADMIN", "SYNDIC"]);

export const requireSyndicStrict = () =>
  requireRole(["PROFESSIONAL_SYNDIC", "SYNDIC"]);

export const requireGlobalScope = () => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;
    if (!user) {
      return reply.status(401).send({ error: "Usuário não autenticado" });
    }
    if (user.permissionScope !== "GLOBAL") {
      return reply.status(403).send({ error: "Acesso global necessário" });
    }
  };
};

/**
 * Lista global agregada (pendentes de aprovação, condomínios, etc):
 * somente PROFESSIONAL_SYNDIC com escopo GLOBAL.
 *
 * SUPER_ADMIN NÃO tem acesso — é operador de plataforma, não de condomínios.
 *
 * @deprecated Use `requireRole(['PROFESSIONAL_SYNDIC']) + requireGlobalScope()`
 * in new code. Kept here so existing routes continue to compile.
 */
export const requireSuperAdminOrGlobalProfessionalSyndic = () => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;
    if (!user) {
      return reply.status(401).send({ error: "Usuário não autenticado" });
    }
    if (
      user.role === "PROFESSIONAL_SYNDIC" &&
      user.permissionScope === "GLOBAL"
    ) {
      return;
    }
    return reply.status(403).send({ error: "Acesso negado" });
  };
};

/**
 * Exige acesso ao condomínio. SUPER_ADMIN NÃO tem bypass — ele não é
 * operador de condomínio.
 *
 * @deprecated Use `requireCondoAccess(config)` directly. Kept as an alias
 * so existing routes continue to compile after the SA bypass was removed.
 */
export const requireCondoAccessUnlessSuperAdmin = (
  config: CondoAccessConfig = {}
) => requireCondoAccess(config);

export const requireComplaintOwner = () => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;
    if (!user) {
      return reply.status(401).send({ error: "Usuário não autenticado" });
    }
    if (user.role !== "RESIDENT" || !user.residentId) {
      return reply.status(403).send({ error: "Apenas moradores podem avaliar" });
    }
    const complaintId = Number((request.params as Record<string, string>).id);
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) {
      return reply.status(404).send({ error: "Ocorrência não encontrada" });
    }
    if (complaint.residentId !== user.residentId) {
      return reply.status(403).send({ error: "Você só pode avaliar suas próprias ocorrências" });
    }
  };
};

export const requireComplaintOwnerAction = (errorMessage: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;
    if (!user) return reply.status(401).send({ error: "Usuário não autenticado" });
    if (user.role !== "RESIDENT" || !user.residentId)
      return reply.status(403).send({ error: errorMessage });
    const complaintId = Number((request.params as Record<string, string>).id);
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return reply.status(404).send({ error: "Ocorrência não encontrada" });
    if (complaint.residentId !== user.residentId)
      return reply.status(403).send({ error: errorMessage });
  };
};

