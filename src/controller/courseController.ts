import { Request } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { CourseService } from "../service/courseService.js";
import { AppError } from "../errors/AppError.js";
import { AuthenticatedRequest } from "../middlewares/auth.js";

const courseService = new CourseService();

export const addCourse = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const course = await courseService.addCourse({
    title: req.body.title,
    price: req.body.price,
    admin_id: req.user!.id,
  });
  res.status(201).json({ success: true, data: course });
});

export const getAllCourses = asyncHandler(async (_req: Request, res) => {
  const courses = await courseService.getAllCourses();
  res.status(200).json({ success: true, data: courses });
});

export const getCourseById = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const course = await courseService.getCourseById(id);
  if (!course) {
    throw new AppError("Course not found", 404);
  }
  res.status(200).json({ success: true, data: course });
});

export const updateCourse = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const id = req.params.id as string;
    const { title, price } = req.body;
    const course = await courseService.updateCourse(id, req.user!.id, {
      title,
      price,
    });
    if (!course) {
      throw new AppError("Course not found", 404);
    }
    res.status(200).json({ success: true, data: course });
  }
);

export const deleteCourse = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const id = req.params.id as string;
    const course = await courseService.deleteCourse(id, req.user!.id);
    if (!course) {
      throw new AppError("Course not found", 404);
    }
    res.status(200).json({ success: true, data: course });
  }
);