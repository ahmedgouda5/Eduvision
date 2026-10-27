import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import {
  addUser,
  login,
  getAllUsers,
  deleteUser,
  updateUser,
} from "./auth.controller.js";

const router = Router();

//! @route   POST /api/auth/register
router.post("/register", addUser);
//! @route   POST /api/auth/login
router.post("/login", login);
//! @route   GET /api/auth
router.get("/", authenticate, authorize("admin"), getAllUsers);
//! @route   DELETE /api/auth/:id
router.delete("/:id", authenticate, authorize("admin"), deleteUser);
//! @route   PATCH /api/auth/:id
router.patch("/:id", authenticate, authorize("student"), updateUser);

export default router;
