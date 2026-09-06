import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

interface PgError {
  code?: string;
  message?: string;
  constraint?: string;
  stack?: string;
  [key: string]: unknown;
}

function isPgError(error: unknown): error is PgError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as PgError).code === "string"
  );
}

const PG_ERROR_MAP: Record<string, { status: number; message: string }> = {
  "23505": { status: 409, message: "Email already exists" },
  "23503": { status: 409, message: "Related record does not exist" },
  "23502": { status: 400, message: "Missing required field" },
  "22P02": { status: 400, message: "Invalid input value" },
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isPgError(error) && error.code && error.code in PG_ERROR_MAP) {
    const mapped = PG_ERROR_MAP[error.code];
    return new AppError(mapped.message, mapped.status, {
      code: error.code,
      isOperational: true,
    });
  }

  return new AppError("Something went wrong", 500, {
    isOperational: false,
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = toAppError(err);

  if (!appError.isOperational || appError.statusCode >= 500) {
    const name = err instanceof Error ? err.name : "UnknownError";
    const message = err instanceof Error ? err.message : String(err);
    const detail = isPgError(err) ? err.message : undefined;
    console.error(`[${name}] ${message}`, detail ?? "");
  }

  res.status(appError.statusCode).json({
    success: false,
    message: appError.message,
  });
}
