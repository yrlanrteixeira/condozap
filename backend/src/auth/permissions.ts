import { Role, Roles } from "./roles";

export const TicketActions = {
  VIEW_TICKET: "view_ticket",
  UPDATE_TICKET: "update_ticket",
  ASSIGN_TICKET: "assign_ticket",
  PAUSE_RESUME_SLA: "pause_resume_sla",
  UPLOAD_ATTACHMENT: "upload_attachment",
  TRIAGE: "triage",
} as const;

export type TicketAction = (typeof TicketActions)[keyof typeof TicketActions];

export const rolePermissions: Record<Role, TicketAction[]> = {
  [Roles.SUPER_ADMIN]: [],
  [Roles.PROFESSIONAL_SYNDIC]: Object.values(TicketActions),
  [Roles.ADMIN]: Object.values(TicketActions),
  [Roles.SYNDIC]: Object.values(TicketActions),
  [Roles.TRIAGE]: [
    TicketActions.VIEW_TICKET,
    TicketActions.UPDATE_TICKET,
    TicketActions.ASSIGN_TICKET,
    TicketActions.PAUSE_RESUME_SLA,
    TicketActions.UPLOAD_ATTACHMENT,
    TicketActions.TRIAGE,
  ],
  [Roles.SETOR_MANAGER]: [
    TicketActions.VIEW_TICKET,
    TicketActions.UPDATE_TICKET,
    TicketActions.ASSIGN_TICKET,
    TicketActions.PAUSE_RESUME_SLA,
    TicketActions.UPLOAD_ATTACHMENT,
  ],
  [Roles.SETOR_MEMBER]: [
    TicketActions.VIEW_TICKET,
    TicketActions.UPDATE_TICKET,
    TicketActions.PAUSE_RESUME_SLA,
    TicketActions.UPLOAD_ATTACHMENT,
  ],
  [Roles.RESIDENT]: [
    TicketActions.VIEW_TICKET,
    TicketActions.UPLOAD_ATTACHMENT,
  ],
};

export const roleCanExecute = (role: Role, action: TicketAction): boolean =>
  rolePermissions[role]?.includes(action) ?? false;
