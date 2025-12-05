/**
 * Resident Validation Schemas
 *
 * Simple validation functions
 */

import { isValidEmail, isValidPhone, isMinLength } from "../utils/validation.js";
import type { CreateResidentRequest, UpdateResidentRequest } from "../types/requests.js";

export function validateCreateResident(data: CreateResidentRequest): string | null {
  if (!isMinLength(data.name, 3)) {
    return "Nome deve ter no mínimo 3 caracteres";
  }
  if (!isValidEmail(data.email)) {
    return "Email inválido";
  }
  if (!isValidPhone(data.phone)) {
    return "Telefone inválido (formato: 5511999999999)";
  }
  if (!data.condominiumId || !data.tower || !data.floor || !data.unit) {
    return "Campos obrigatórios faltando";
  }
  return null;
}

export function validateUpdateResident(data: UpdateResidentRequest): string | null {
  if (data.name && !isMinLength(data.name, 3)) {
    return "Nome deve ter no mínimo 3 caracteres";
  }
  if (data.email && !isValidEmail(data.email)) {
    return "Email inválido";
  }
  if (data.phone && !isValidPhone(data.phone)) {
    return "Telefone inválido (formato: 5511999999999)";
  }
  return null;
}
