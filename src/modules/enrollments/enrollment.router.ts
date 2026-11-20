import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import {
  addEnrollment,
  getAllEnrollments,
  getCourseEnrollments,
  getMyEnrollments,
  hasCourseAccess,
} from "./enrollment.controller.js";

const router = Router();

router.post("/", authenticate, authorize("student"), addEnrollment);
router.get("/", authenticate, authorize("admin"), getAllEnrollments);
router.get(
  "/my-enrollments",
  authenticate,
  authorize("student"),
  getMyEnrollments,
);
router.get(
  "/access/:courseId/",
  authenticate,
  authorize("student"),
  hasCourseAccess,
);

router.get(
  "/course-enrollments/:enrollmentId",
  authenticate,
  authorize("admin"),
  getCourseEnrollments,
);
export default router;
