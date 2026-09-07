import { Request } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { QuestionsService } from "../service/questionsService.js";
import { AppError } from "../errors/AppError.js";

const questionsService = new QuestionsService();

export const addQuestion = asyncHandler(async (req: Request, res) => {
  const question = await questionsService.addQuestion(req.body);
  res.status(201).json({ success: true, data: question });
});

export const getAllQuestions = asyncHandler(async (_req: Request, res) => {
  const questions = await questionsService.getAllQuestions();
  res.status(200).json({ success: true, data: questions });
});

export const getQuestionsByQuiz = asyncHandler(async (req: Request, res) => {
  const quiz_id = req.params.quiz_id as string;
  const questions = await questionsService.getQuestionsByQuiz(quiz_id);
  res.status(200).json({ success: true, data: questions, count: questions.length });
});

export const getQuestionById = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const question = await questionsService.getQuestionById(id);
  if (!question) {
    throw new AppError("Question not found", 404);
  }
  res.status(200).json({ success: true, data: question });
});

export const updateQuestion = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const question = await questionsService.updateQuestion(
    id,
    req.body.quiz_id,
    req.body
  );
  if (!question) {
    throw new AppError("Question not found", 404);
  }
  res.status(200).json({ success: true, data: question });
});

export const deleteQuestion = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const question = await questionsService.deleteQuestion(id, req.body.quiz_id);
  if (!question) {
    throw new AppError("Question not found", 404);
  }
  res.status(200).json({ success: true, data: question });
});