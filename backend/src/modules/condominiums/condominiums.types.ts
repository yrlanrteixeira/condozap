export type CondominiumStatus = "TRIAL" | "ACTIVE" | "SUSPENDED";

export interface CreateCondominiumRequest {
  name: string;
  cnpj: string;
  whatsappPhone?: string;
  whatsappBusinessId?: string;
}

export interface UpdateCondominiumRequest {
  name?: string;
  cnpj?: string;
  status?: CondominiumStatus;
  whatsappPhone?: string;
  whatsappBusinessId?: string;
}
