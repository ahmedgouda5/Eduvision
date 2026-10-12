import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import {
  submitAttempt,
  getMyAttempts,
  getAttemptsByQuiz,
} from "./quiz_attempts.controller.js";

const router = Router();

// ! Student submits their answers → server calculates & saves score
router.post("/", authenticate, authorize("student"), submitAttempt);

// ! Student gets their own attempt history
router.get("/me", authenticate, authorize("student"), getMyAttempts);

// ! Admin gets all attempts for a specific quiz
router.get(
  "/quiz/:quiz_id",
  authenticate,
  authorize("admin"),
  getAttemptsByQuiz,
);

export default router;
