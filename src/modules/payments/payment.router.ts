import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { addPayment, getAllPayments } from "./payment.controller.js";

const router = Router();

router.post("/", authenticate, authorize("student"), addPayment);
router.get("/", authenticate, authorize("admin"), getAllPayments);

export default router;
