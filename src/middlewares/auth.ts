import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";

const SECRET = process.env.JWT_SECRET || "eduvision-secret";

interface JwtPayload {
  id: number;
  role: "admin" | "student";
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

function getBearerToken(req: Request): string | undefined {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : req.headers.authorization?.split(" ")[1];
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);

  if (!token) {
    return next(new AppError("No token provided", 401));
  }

  try {
    const decoded = jwt.verify(token, SECRET) as JwtPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError("Token expired", 401));
    }
    return next(new AppError("Invalid token", 401));
  }
}

export function authorize(...roles: Array<"admin" | "student">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user || !roles.includes(user.role)) {
      return next(new AppError("Forbidden", 403));
    }

    next();
  };
}
