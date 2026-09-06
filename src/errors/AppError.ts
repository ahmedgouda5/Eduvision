export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    options: { code?: string; details?: unknown; isOperational?: boolean } = {}
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = options.code;
    this.details = options.details;
    this.isOperational = options.isOperational ?? statusCode < 500;

    Error.captureStackTrace(this, this.constructor);
  }
}
