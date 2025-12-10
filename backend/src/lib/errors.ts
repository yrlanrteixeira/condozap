/**
 * Application Error Classes (DIP - Dependency Inversion)
 * 
 * Custom error classes that allow routes to throw semantic errors
 * and the global handler to convert them to HTTP responses.
 * 
 * WHY: Removes the need for try/catch in every route handler.
 * Routes just throw errors, the middleware handles response formatting.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 400 - Bad Request (validation errors, invalid input)
export class BadRequestError extends AppError {
  constructor(message: string = "Requisicao invalida") {
    super(message, 400);
  }
}

// 401 - Unauthorized (not authenticated)
export class UnauthorizedError extends AppError {
  constructor(message: string = "Nao autenticado") {
    super(message, 401);
  }
}

// 403 - Forbidden (authenticated but not allowed)
export class ForbiddenError extends AppError {
  constructor(message: string = "Acesso negado") {
    super(message, 403);
  }
}

// 404 - Not Found
export class NotFoundError extends AppError {
  constructor(resource: string = "Recurso") {
    super(`${resource} nao encontrado`, 404);
  }
}

// 409 - Conflict (duplicate entry, already exists)
export class ConflictError extends AppError {
  constructor(message: string = "Recurso ja existe") {
    super(message, 409);
  }
}

// 422 - Unprocessable Entity (validation passed but business rule failed)
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message: string = "Erro de validacao", errors: Record<string, string[]> = {}) {
    super(message, 422);
    this.errors = errors;
  }
}
