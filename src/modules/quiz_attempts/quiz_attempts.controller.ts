import { Request } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { QuizAttemptsService } from "./quiz_attempts.service.js";
import { AuthenticatedRequest } from "../../middlewares/auth.js";

const quizAttemptsService = new QuizAttemptsService();

// # POST /api/quiz-attempts — student submits their answers, server calculates score
export const submitAttempt = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const attempt = await quizAttemptsService.submitAttempt({
      user_id: req.user!.id,
      quiz_id: req.body.quiz_id,
      answers: req.body.answers, // [{ question_id, option_id }, ...]
    });
    res.status(201).json({ success: true, data: attempt });
  },
);

// * GET /api/quiz-attempts/me — student sees their own attempts
export const getMyAttempts = asyncHandler(
  async (req: AuthenticatedRequest, res) => {
    const attempts = await quizAttemptsService.getMyAttempts(req.user!.id);
    res.status(200).json({ success: true, data: attempts });
  },
);

// * GET /api/quiz-attempts/quiz/:quiz_id — admin sees all attempts for a quiz
export const getAttemptsByQuiz = asyncHandler(
  async (req: Request, res) => {
    const quiz_id = req.params.quiz_id as string;
    const attempts = await quizAttemptsService.getAttemptsByQuiz(quiz_id);
    res.status(200).json({ success: true, data: attempts });
  },
);
