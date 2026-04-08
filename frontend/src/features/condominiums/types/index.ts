/**
 * Condominiums Types
 */

export type CondominiumStatus = "TRIAL" | "ACTIVE" | "SUSPENDED";

export interface Condominium {
  id: string;
  name: string;
  slug: string;
  cnpj: string;
  status: CondominiumStatus;
  whatsappPhone: string | null;
  whatsappBusinessId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    residents: number;
    users: number;
    complaints: number;
  };
}

export interface CreateCondominiumInput {
  name: string;
  cnpj: string;
  slug?: string;
  whatsappPhone?: string;
  whatsappBusinessId?: string;
}

export interface UpdateCondominiumInput {
  name?: string;
  slug?: string;
  cnpj?: string;
  status?: CondominiumStatus;
  whatsappPhone?: string;
  whatsappBusinessId?: string;
}

export interface CondominiumStats {
  residents: number;
  complaints: {
    open: number;
    resolved: number;
    total: number;
  };
  messages: number;
}
