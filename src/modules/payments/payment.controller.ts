import { Request } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { AuthenticatedRequest } from "../../middlewares/auth.js";
import { PaymentService } from "./payment.service.js";

const paymentService = new PaymentService();

//! @desc    Create a payment
//! @route   POST /api/payments
//! @access  Private (student)
export const addPayment = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const payment = await paymentService.createPayment({
      userId: req.user!.id,
      enrollmentId: req.body.enrollmentId,
      method: req.body.method,
      senderName: req.body.senderName,
      senderPhone: req.body.senderPhone,
      transactionNumber: req.body.transactionNumber,
    });
    res.status(201).json({ success: true, data: payment });
  },
);

//! @desc    Get all payments
//! @route   GET /api/payments
//! @access  Private (admin)
export const getAllPayments = asyncHandler(async (_req: Request, res) => {
  const payments = await paymentService.getAllPayments();
  res.status(200).json({ success: true, data: payments });
});
