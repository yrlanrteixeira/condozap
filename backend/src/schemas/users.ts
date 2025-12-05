/**
 * User Validation Schemas
 *
 * Simple validation functions
 */

import { isValidEmail, isMinLength } from "../utils/validation.js";
import type {
  CreateAdminRequest,
  CreateSyndicRequest,
  UpdateUserRoleRequest,
  RemoveUserRequest,
  InviteUserRequest,
} from "../types/requests.js";

export function validateCreateAdmin(data: CreateAdminRequest): string | null {
  if (!isValidEmail(data.email)) {
    return "Email inválido";
  }
  if (!isMinLength(data.name, 3)) {
    return "Nome deve ter no mínimo 3 caracteres";
  }
  if (!isMinLength(data.password, 8)) {
    return "Senha deve ter no mínimo 8 caracteres";
  }
  if (!data.condominiumId) {
    return "Condomínio é obrigatório";
  }
  return null;
}

export function validateCreateSyndic(data: CreateSyndicRequest): string | null {
  if (!isValidEmail(data.email)) {
    return "Email inválido";
  }
  if (!isMinLength(data.name, 3)) {
    return "Nome deve ter no mínimo 3 caracteres";
  }
  if (!isMinLength(data.password, 8)) {
    return "Senha deve ter no mínimo 8 caracteres";
  }
  if (!data.condominiumIds || data.condominiumIds.length === 0) {
    return "Selecione pelo menos um condomínio";
  }
  return null;
}

export function validateUpdateUserRole(data: UpdateUserRoleRequest): string | null {
  if (!data.userId) {
    return "ID do usuário é obrigatório";
  }
  if (!["ADMIN", "SYNDIC", "RESIDENT"].includes(data.newRole)) {
    return "Função inválida";
  }
  return null;
}

export function validateRemoveUser(data: RemoveUserRequest): string | null {
  if (!data.userId) {
    return "ID do usuário é obrigatório";
  }
  if (!data.condominiumId) {
    return "ID do condomínio é obrigatório";
  }
  return null;
}

export function validateInviteUser(data: InviteUserRequest): string | null {
  if (!isValidEmail(data.email)) {
    return "Email inválido";
  }
  if (!data.condominiumId) {
    return "Condomínio é obrigatório";
  }
  if (!["ADMIN", "SYNDIC", "RESIDENT"].includes(data.role)) {
    return "Função inválida";
  }
  return null;
}
