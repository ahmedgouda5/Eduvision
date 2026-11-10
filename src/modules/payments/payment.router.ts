import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { addPayment } from "./payment.controller.js";

const router = Router();

router.post("/", authenticate, authorize("student"), addPayment);

export default router;
