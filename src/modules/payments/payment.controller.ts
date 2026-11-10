import { Request } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { PaymentService } from "./payment.service.js";

const paymentService = new PaymentService();

//! @desc    Create a payment
//! @route   POST /api/payments
//! @access  Private (student)
export const addPayment = asyncHandler(async (req: Request, res) => {
  const payment = await paymentService.createPayment({
    enrollmentId: req.body.enrollmentId,
    amount: req.body.amount,
    method: req.body.method,
    senderName: req.body.senderName,
    senderPhone: req.body.senderPhone,
    transactionNumber: req.body.transactionNumber,
  });
  res.status(201).json({ success: true, data: payment });
});
