export interface AuthTokenPayload {
  id: string;
  email: string;
  role:
    | "SUPER_ADMIN"
    | "PROFESSIONAL_SYNDIC"
    | "ADMIN"
    | "SYNDIC"
    | "TRIAGE"
    | "SETOR_MANAGER"
    | "SETOR_MEMBER"
    | "RESIDENT";
  status: string;
  name?: string;
  permissionScope?: "GLOBAL" | "LOCAL";
  residentId?: string;
}

export interface AuthenticatedUser extends AuthTokenPayload {}
