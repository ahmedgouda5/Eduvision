import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";
import { verifyToken } from "../utils/token.js";

interface JwtPayload {
  id: string;
  role: "admin" | "student";
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return next(new AppError("No token provided", 401));
  }

  try {
    const decoded = verifyToken(token) as JwtPayload;

    (req as AuthenticatedRequest).user = decoded;

    return next();
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

    if (!user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(user.role)) {
      return next(
        new AppError("You are not allowed to access this resource", 403),
      );
    }

    return next();
  };
}
