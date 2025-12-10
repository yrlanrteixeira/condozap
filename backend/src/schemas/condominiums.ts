/**
 * Condominium Validation Schemas
 *
 * Simple validation functions
 */

import {
  isValidCnpj,
  isMinLength,
  isValidCondominiumStatus,
} from "../shared/utils/validation";
import type {
  CreateCondominiumRequest,
  UpdateCondominiumRequest,
} from "../types/requests";

export function validateCreateCondominium(data: CreateCondominiumRequest): string | null {
  if (!isMinLength(data.name, 3)) {
    return "Nome deve ter no mínimo 3 caracteres";
  }
  if (!isValidCnpj(data.cnpj)) {
    return "CNPJ deve ter 14 dígitos";
  }
  return null;
}

export function validateUpdateCondominium(data: UpdateCondominiumRequest): string | null {
  if (data.name && !isMinLength(data.name, 3)) {
    return "Nome deve ter no mínimo 3 caracteres";
  }
  if (data.cnpj && !isValidCnpj(data.cnpj)) {
    return "CNPJ deve ter 14 dígitos";
  }
  if (data.status && !isValidCondominiumStatus(data.status)) {
    return "Status inválido";
  }
  return null;
}
