import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import {
  addUser,
  getAllUsers,
  deleteUser,
  updateUser,
} from "../controller/authController.js";

const router = Router();

router.post("/register", addUser);
router.get("/", authenticate, authorize("admin"), getAllUsers);
router.delete("/:id", authenticate, authorize("admin", "student"), deleteUser);
router.patch("/:id", authenticate, authorize("student"), updateUser);

export default router;
