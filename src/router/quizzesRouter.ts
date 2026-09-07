import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import {
  addQuiz,
  getAllQuizzes,
  getQuizById,
  getQuizByLesson,
  updateQuiz,
  deleteQuiz,
} from "../controller/quizzesController.js";

const router = Router();

router.post("/", authenticate, authorize("admin"), addQuiz);
router.get("/", authenticate, getAllQuizzes);
router.get("/lesson/:lesson_id", authenticate, getQuizByLesson);
router.get("/:id", authenticate, getQuizById);
router.patch("/:id", authenticate, authorize("admin"), updateQuiz);
router.delete("/:id", authenticate, authorize("admin"), deleteQuiz);

export default router;