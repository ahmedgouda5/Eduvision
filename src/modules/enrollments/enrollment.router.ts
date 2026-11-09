import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import {
  addEnrollment,
  getAllEnrollments,
} from "./enrollment.controller.js";

const router = Router();

router.post("/", authenticate, authorize("student"), addEnrollment);
router.get("/", authenticate, authorize("admin"), getAllEnrollments);

export default router;
