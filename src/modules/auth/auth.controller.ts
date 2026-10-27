import { Request } from "express";
import { AuthenticatedRequest } from "../../middlewares/auth.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { AuthService } from "./auth.service.js";
import { signToken } from "../../utils/token.js";
import { AppError } from "../../errors/AppError.js";

const authService = new AuthService();

//! @desc    Register a new user
//! @route   POST /api/auth/register
//! @access  Public
export const addUser = asyncHandler(async (req: Request, res) => {
  await authService.addUser(req.body);
  res.status(201).json({
    success: true,
    msg: "User registered successfully Go to login",
  });
});

//! @desc    Login a user
//! @route   POST /api/auth/login
//! @access  Public
export const login = asyncHandler(async (req: Request, res) => {
  const user = await authService.login(req.body);
  const token = signToken({ id: user.id, role: user.role });

  res.cookie("token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    msg: "User logged in successfully",
  });
});

//! @desc    Get all users
//! @route   GET /api/auth
//! @access  Private
export const getAllUsers = asyncHandler(
  async (_req: AuthenticatedRequest, res) => {
    const users = await authService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  },
);

//! @desc    Delete a user
//! @route   DELETE /api/auth/:id
//! @access  Private
export const deleteUser = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const user = await authService.deleteUser(id);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  res.status(200).json({ success: true, data: user });
});

//! @desc    Update a user
//! @route   PATCH /api/auth/:id
//! @access  Private
export const updateUser = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const user = await authService.updateUser(id, req.body);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  res.status(200).json({ success: true, data: user });
});
