import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import {
  addLesson,
  getAllLessons,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
} from "../controller/lessonsController.js";

const router = Router();

router.post("/", authenticate, authorize("admin"), addLesson);
router.get("/", authenticate, getAllLessons);
router.get("/course/:course_id", authenticate, getLessonsByCourse);
router.get("/:id", authenticate, getLessonById);
router.patch("/:id", authenticate, authorize("admin"), updateLesson);
router.delete("/:id", authenticate, authorize("admin"), deleteLesson);

export default router;