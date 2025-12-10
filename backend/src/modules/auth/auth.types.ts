export interface AuthTokenPayload {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "PROFESSIONAL_SYNDIC" | "ADMIN" | "SYNDIC" | "RESIDENT";
  status: string;
  residentId?: string;
}

export interface AuthenticatedUser extends AuthTokenPayload {}
