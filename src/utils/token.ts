import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "eduvision-secret";

export function signToken(payload: { id: string; role: "admin" | "student" }) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}