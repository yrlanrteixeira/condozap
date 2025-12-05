/**
 * Complaint Validation Schemas
 *
 * Simple validation functions
 */

import { isValidPriority, isValidStatus, isMinLength } from "../utils/validation.js";
import type {
  CreateComplaintRequest,
  UpdateComplaintStatusRequest,
  UpdateComplaintPriorityRequest,
  AddComplaintCommentRequest,
} from "../types/requests.js";

export function validateCreateComplaint(data: CreateComplaintRequest): string | null {
  if (!data.condominiumId || !data.residentId) {
    return "Condomínio e morador são obrigatórios";
  }
  if (!isMinLength(data.category, 3)) {
    return "Categoria deve ter no mínimo 3 caracteres";
  }
  if (!isMinLength(data.content, 10)) {
    return "Conteúdo deve ter no mínimo 10 caracteres";
  }
  if (data.priority && !isValidPriority(data.priority)) {
    return "Prioridade inválida";
  }
  return null;
}

export function validateUpdateStatus(data: UpdateComplaintStatusRequest): string | null {
  if (!isValidStatus(data.status)) {
    return "Status inválido";
  }
  return null;
}

export function validateUpdatePriority(data: UpdateComplaintPriorityRequest): string | null {
  if (!isValidPriority(data.priority)) {
    return "Prioridade inválida";
  }
  return null;
}

export function validateAddComment(data: AddComplaintCommentRequest): string | null {
  if (!isMinLength(data.notes, 1)) {
    return "Comentário não pode ser vazio";
  }
  return null;
}
