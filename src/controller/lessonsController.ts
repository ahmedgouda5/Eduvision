import { Request } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { LessonsService } from "../service/lessonsService.js";
import { AppError } from "../errors/AppError.js";

const lessonsService = new LessonsService();

export const addLesson = asyncHandler(async (req: Request, res) => {
  const lesson = await lessonsService.addLesson({
    course_id: req.body.course_id,
    title: req.body.title,
    duration_sec: req.body.duration_sec,
  });
  res.status(201).json({ success: true, data: lesson });
});

export const getAllLessons = asyncHandler(async (_req: Request, res) => {
  const lessons = await lessonsService.getAllLessons();
  res.status(200).json({ success: true, data: lessons });
});

export const getLessonsByCourse = asyncHandler(async (req: Request, res) => {
  const course_id = req.params.course_id as string;
  const lessons = await lessonsService.getLessonsByCourse(course_id);
  res.status(200).json({ success: true, data: lessons, count: lessons.length });
});

export const getLessonById = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const lesson = await lessonsService.getLessonById(id);
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }
  res.status(200).json({ success: true, data: lesson });
});

export const updateLesson = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const { title, duration_sec } = req.body;
  const lesson = await lessonsService.updateLesson(id, req.body.course_id, {
    title,
    duration_sec,
  });
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }
  res.status(200).json({ success: true, data: lesson });
});

export const deleteLesson = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const lesson = await lessonsService.deleteLesson(id, req.body.course_id);
  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }
  res.status(200).json({ success: true, data: lesson });
});