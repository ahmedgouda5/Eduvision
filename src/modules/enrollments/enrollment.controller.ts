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
export const getAllEnrollments = asyncHandler(async (_req: Request, res) => {
  const enrollments = await enrollmentService.getAllEnrollments();
  res.status(200).json({ success: true, data: enrollments });
});

export const getMyEnrollments = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const enrollments = await enrollmentService.getMyEnrollments(req.user!.id);
    res.status(200).json({ success: true, data: enrollments });
  },
);

export const hasCourseAccess = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const courseId = Array.isArray(req.params.courseId)
      ? req.params.courseId[0]
      : req.params.courseId;
    const hasAccess = await enrollmentService.hasCourseAccess(
      req.user!.id,
      courseId,
    );
    res.status(200).json({ success: true, data: { hasAccess } });
  },
);

export const getCourseEnrollments = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const enrollmentId = Array.isArray(req.params.enrollmentId)
      ? req.params.enrollmentId[0]
      : req.params.enrollmentId;
    const enrollment =
      await enrollmentService.getCourseEnrollments(enrollmentId);
    res.status(200).json({ success: true, data: enrollment });
  },
);
