import { Request } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { AuthenticatedRequest } from "../../middlewares/auth.js";
import { EnrollmentService } from "./enrollment.service.js";

const enrollmentService = new EnrollmentService();

//! @desc    Create an enrollment
//! @route   POST /api/enrollments
//! @access  Private
export const addEnrollment = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const enrollment = await enrollmentService.createEnrollment({
      userId: req.user!.id,
      courseId: req.body.courseId,
    });
    res.status(201).json({ success: true, data: enrollment });
  },
);

//! @desc    Get all enrollments
//! @route   GET /api/enrollments
//! @access  Private (admin)
export const getAllEnrollments = asyncHandler(
  async (_req: Request, res) => {
    const enrollments = await enrollmentService.getAllEnrollments();
    res.status(200).json({ success: true, data: enrollments });
  },
);
