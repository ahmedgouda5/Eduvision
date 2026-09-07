import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import {
  addQuestion,
  getAllQuestions,
  getQuestionsByQuiz,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} from "../controller/questionsController.js";

const router = Router();

router.post("/", authenticate, authorize("admin"), addQuestion);
router.get("/", authenticate, getAllQuestions);
router.get("/quiz/:quiz_id", authenticate, getQuestionsByQuiz);
router.get("/:id", authenticate, getQuestionById);
router.patch("/:id", authenticate, authorize("admin"), updateQuestion);
router.delete("/:id", authenticate, authorize("admin"), deleteQuestion);

export default router;