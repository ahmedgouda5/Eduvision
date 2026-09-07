import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import {
  addOption,
  getAllOptions,
  getOptionsByQuestion,
  getOptionById,
  updateOption,
  deleteOption,
  checkAnswer,
} from "../controller/optionsController.js";

const router = Router();

router.post("/", authenticate, authorize("admin"), addOption);
router.get("/", authenticate, getAllOptions);
router.post("/check-answer", authenticate, checkAnswer);
router.get("/question/:question_id", authenticate, getOptionsByQuestion);
router.get("/:id", authenticate, getOptionById);
router.patch("/:id", authenticate, authorize("admin"), updateOption);
router.delete("/:id", authenticate, authorize("admin"), deleteOption);

export default router;