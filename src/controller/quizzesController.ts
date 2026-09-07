import { Request } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { QuizzesService } from "../service/quizzesService.js";
import { AppError } from "../errors/AppError.js";

const quizzesService = new QuizzesService();

export const addQuiz = asyncHandler(async (req: Request, res) => {
  const quiz = await quizzesService.addQuiz(req.body);
  res.status(201).json({ success: true, data: quiz });
});

export const getAllQuizzes = asyncHandler(async (_req: Request, res) => {
  const quizzes = await quizzesService.getAllQuizzes();
  res.status(200).json({ success: true, data: quizzes });
});

export const getQuizById = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const quiz = await quizzesService.getQuizById(id);
  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }
  res.status(200).json({ success: true, data: quiz });
});

export const getQuizByLesson = asyncHandler(async (req: Request, res) => {
  const lesson_id = req.params.lesson_id as string;
  const quiz = await quizzesService.getQuizByLesson(lesson_id);
  if (!quiz) {
    throw new AppError("Quiz not found for this lesson", 404);
  }
  res.status(200).json({ success: true, data: quiz });
});

export const updateQuiz = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const quiz = await quizzesService.updateQuiz(
    id,
    req.body.lesson_id,
    req.body
  );
  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }
  res.status(200).json({ success: true, data: quiz });
});

export const deleteQuiz = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const quiz = await quizzesService.deleteQuiz(id, req.body.lesson_id);
  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }
  res.status(200).json({ success: true, data: quiz });
});