import { Request } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { AuthService } from "../service/userService.js";
import { signToken } from "../utils/token.js";
import { AppError } from "../errors/AppError.js";

const authService = new AuthService();

export const addUser = asyncHandler(async (req: Request, res) => {
  const user = await authService.addUser(req.body);
  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ success: true, data: user, token });
});

export const getAllUsers = asyncHandler(async (_req: Request, res) => {
  const users = await authService.getAllUsers();
  res.status(200).json({ success: true, data: users });
});

export const deleteUser = asyncHandler(async (req: Request, res) => {
  const id = Number(req.params.id);
  const user = await authService.deleteUser(id);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  res.status(200).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req: Request, res) => {
  const id = Number(req.params.id);
  const user = await authService.updateUser(id, req.body);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  res.status(200).json({ success: true, data: user });
});
