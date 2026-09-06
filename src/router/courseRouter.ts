import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import {
  addCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../controller/courseController.js";

const router = Router();

router.post("/", authenticate, authorize("admin"), addCourse);
router.get("/", authenticate, getAllCourses);
router.get("/:id", authenticate, getCourseById);
router.patch("/:id", authenticate, authorize("admin"), updateCourse);
router.delete("/:id", authenticate, authorize("admin"), deleteCourse);

export default router;