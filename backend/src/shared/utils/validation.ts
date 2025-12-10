/**
 * Validation Utilities
 *
 * Simple validation functions
 */

export function isValidEmail(email: string): boolean {
  return email?.includes("@") && email.length > 3;
}

export function isValidPhone(phone: string): boolean {
  return /^55\d{10,11}$/.test(phone);
}

export function isValidCnpj(cnpj: string): boolean {
  return /^\d{14}$/.test(cnpj);
}

export function isMinLength(value: string, min: number): boolean {
  return value?.length >= min;
}

export function isValidPriority(priority: string): boolean {
  return ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(priority);
}

export function isValidStatus(status: string): boolean {
  return ["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status);
}

export function isValidResidentType(type: string): boolean {
  return ["OWNER", "TENANT"].includes(type);
}

export function isValidCondominiumStatus(status: string): boolean {
  return ["TRIAL", "ACTIVE", "SUSPENDED"].includes(status);
}
