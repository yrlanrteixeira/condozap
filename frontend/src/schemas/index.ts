/**
 * Central export for all Zod schemas
 * Provides runtime validation for forms, API payloads, and data integrity
 *
 * Usage:
 * ```typescript
 * import { CreateComplaintSchema } from '@/schemas'
 *
 * const result = CreateComplaintSchema.safeParse(formData)
 * if (!result.success) {
 *   console.error(result.error.flatten())
 * }
 * ```
 */

// Resident schemas
export {
  ResidentSchema,
  CreateResidentSchema,
  UpdateResidentSchema,
  ImportResidentSchema,
  type ResidentInput,
  type CreateResidentInput,
  type UpdateResidentInput,
  type ImportResidentInput,
} from './resident.schema';

// Complaint schemas
export {
  ComplaintSchema,
  ComplaintStatusEnum,
  ComplaintPriorityEnum,
  CreateComplaintSchema,
  UpdateComplaintStatusSchema,
  UpdateComplaintPrioritySchema,
  ComplaintFiltersSchema,
  type ComplaintInput,
  type CreateComplaintInput,
  type UpdateComplaintStatusInput,
  type UpdateComplaintPriorityInput,
  type ComplaintFiltersInput,
} from './complaint.schema';

// Message schemas
export {
  MessageSchema,
  MessageTypeEnum,
  MessageScopeEnum,
  MessageStatusEnum,
  SendTextMessageSchema,
  SendTemplateMessageSchema,
  UpdateMessageStatusSchema,
  ValidatePhoneSchema,
  type MessageInput,
  type SendTextMessageInput,
  type SendTemplateMessageInput,
  type UpdateMessageStatusInput,
  type ValidatePhoneInput,
} from './message.schema';

// Condominium schemas
export {
  CondominiumSchema,
  CreateCondominiumSchema,
  UpdateCondominiumSchema,
  ConfigureWhatsAppSchema,
  ImportStructureSchema,
  type CondominiumInput,
  type CreateCondominiumInput,
  type UpdateCondominiumInput,
  type ConfigureWhatsAppInput,
  type ImportStructureInput,
} from './condominium.schema';

// User & Auth schemas
export {
  UserSchema,
  UserRoleEnum,
  PermissionScopeEnum,
  RegisterUserSchema,
  LoginSchema,
  ResetPasswordSchema,
  UpdateProfileSchema,
  SetupMFASchema,
  type UserInput,
  type RegisterUserInput,
  type LoginInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
  type SetupMFAInput,
} from './user.schema';
