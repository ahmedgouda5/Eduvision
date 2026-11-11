import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { addPayment, getAllPayments, approvePayment } from "./payment.controller.js";

const router = Router();

router.post("/", authenticate, authorize("student"), addPayment);
router.get("/", authenticate, authorize("admin"), getAllPayments);
router.patch("/:id/approve", authenticate, authorize("admin"), approvePayment);

export default router;
