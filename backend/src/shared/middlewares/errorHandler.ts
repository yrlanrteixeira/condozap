/**
 * Global Error Handler (DIP - Dependency Injection Pattern)
 *
 * Centralized error handling that captures all exceptions from routes and services.
 * Normalizes error responses with appropriate status codes.
 *
 * WHY:
 * - SRP: Routes focus on business logic, not error formatting
 * - DRY: One place to handle all errors consistently
 * - DIP: Logger is injected, can be swapped for tests
 */

import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, ValidationError } from "../errors";

interface ErrorResponse {
  error: {
    message: string;
    statusCode: number;
    code?: string;
    errors?: Record<string, string[]>;
  };
}

/**
 * Formats Zod validation errors into a user-friendly structure
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}

/**
 * Creates the global error handler with injected logger
 *
 * Usage in server.ts:
 *   fastify.setErrorHandler(createErrorHandler(fastify.log));
 */
export function createErrorHandler(logger: {
  error: (obj: object, msg?: string) => void;
}) {
  return function errorHandler(
    error: FastifyError | Error,
    request: FastifyRequest,
    reply: FastifyReply
  ): FastifyReply {
    const response: ErrorResponse = {
      error: {
        message: "Erro interno do servidor",
        statusCode: 500,
      },
    };

    // ========================================
    // 1. Zod Validation Errors (schema validation)
    // ========================================
    if (error instanceof ZodError) {
      response.error.message = "Erro de validacao";
      response.error.statusCode = 400;
      response.error.code = "VALIDATION_ERROR";
      response.error.errors = formatZodErrors(error);

      logger.error(
        {
          path: request.url,
          method: request.method,
          errors: response.error.errors,
        },
        "Validation error"
      );

      return reply.status(400).send(response);
    }

    // ========================================
    // 2. Custom AppError (semantic errors from services)
    // ========================================
    if (error instanceof AppError) {
      response.error.message = error.message;
      response.error.statusCode = error.statusCode;
      response.error.code = error.code;

      if (
        error instanceof ValidationError &&
        Object.keys(error.errors).length > 0
      ) {
        response.error.errors = error.errors;
      }

      // Only log 500+ as errors, others as warnings
      if (error.statusCode >= 500) {
        logger.error(
          {
            path: request.url,
            method: request.method,
            statusCode: error.statusCode,
            stack: error.stack,
          },
          error.message
        );
      }

      return reply.status(error.statusCode).send(response);
    }

    // ========================================
    // 3. Fastify built-in errors (validation, etc)
    // ========================================
    if ("statusCode" in error && typeof error.statusCode === "number") {
      response.error.message = error.message || "Erro na requisicao";
      response.error.statusCode = error.statusCode;

      return reply.status(error.statusCode).send(response);
    }

    // ========================================
    // 4. Prisma errors (database)
    // ========================================
    if (error.constructor.name === "PrismaClientKnownRequestError") {
      const prismaError = error as any;

      // P2002: Unique constraint violation
      if (prismaError.code === "P2002") {
        const field = prismaError.meta?.target?.[0] || "campo";
        response.error.message = `${field} ja existe`;
        response.error.statusCode = 409;
        response.error.code = "DUPLICATE_ENTRY";
        return reply.status(409).send(response);
      }

      // P2025: Record not found
      if (prismaError.code === "P2025") {
        response.error.message = "Registro nao encontrado";
        response.error.statusCode = 404;
        response.error.code = "NOT_FOUND";
        return reply.status(404).send(response);
      }

      // P2003: Foreign key constraint violation
      if (prismaError.code === "P2003") {
        response.error.message =
          "Referencia invalida - registro relacionado nao existe";
        response.error.statusCode = 400;
        response.error.code = "FOREIGN_KEY_ERROR";
        return reply.status(400).send(response);
      }
    }

    // ========================================
    // 5. Unknown errors (log full stack)
    // ========================================
    logger.error(
      {
        path: request.url,
        method: request.method,
        error: error.message,
        stack: error.stack,
        name: error.constructor.name,
      },
      "Unhandled error"
    );

    // In production, don't expose internal error details
    response.error.code = "INTERNAL_ERROR";
    if (process.env.NODE_ENV === "production") {
      response.error.message = "Erro interno do servidor";
    } else {
      response.error.message = error.message || "Erro interno do servidor";
    }

    return reply.status(500).send(response);
  };
}
