import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";

export function signToken(payload: { id: string; role: "admin" | "student" }) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "30d",
    algorithm: "HS256",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
  });
}
