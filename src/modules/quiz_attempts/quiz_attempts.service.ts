import { eq, inArray } from "drizzle-orm";
import { pool } from "../../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema/index.js";
import { AppError } from "../../errors/AppError.js";

const db = drizzle({ client: pool, schema });

export class QuizAttemptsService {
  // Submit a new attempt — student sends their answers, server calculates the score
  async submitAttempt(data: {
    user_id: string;
    quiz_id: string;
    // Each answer = which option the student chose for each question
    answers: { question_id: string; option_id: string }[];
  }) {
    // 1. Make sure the quiz exists and load its questions
    const quiz = await db.query.quizzes.findFirst({
      where: eq(schema.quizzes.id, data.quiz_id),
      with: { questions: true },
    });
    if (!quiz) throw new AppError("Quiz not found", 404);

    const totalQuestions = quiz.questions.length;

    // 2. Validate: student must answer all questions
    if (data.answers.length !== totalQuestions) {
      throw new AppError(
        `You must answer all ${totalQuestions} questions`,
        400,
      );
    }

    // 3. Fetch the chosen options from DB and count how many are correct
    const chosenOptionIds = data.answers.map((a) => a.option_id);
    const chosenOptions = await db
      .select({ id: schema.options.id, is_correct: schema.options.is_correct })
      .from(schema.options)
      .where(inArray(schema.options.id, chosenOptionIds));

    // Server calculates the score — client never touches this number
    const score = chosenOptions.filter((o) => o.is_correct).length;

    // 4. Insert — the UNIQUE constraint will throw if already attempted
    try {
      const result = await db
        .insert(schema.quiz_attempts)
        .values({ user_id: data.user_id, quiz_id: data.quiz_id, score })
        .returning();
      return { ...result[0], total_questions: totalQuestions };
    } catch (err: any) {
      // * Postgres unique violation code: 23505
      if (err?.code === "23505") {
        throw new AppError("You have already attempted this quiz", 409);
      }
      throw err;
    }
  }

  // * Get all attempts for the currently logged-in student
  async getMyAttempts(user_id: string) {
    const attempts = await db.query.quiz_attempts.findMany({
      where: eq(schema.quiz_attempts.user_id, user_id),
    });
    return attempts;
  }

  // Admin: get all attempts for a specific quiz
  async getAttemptsByQuiz(quiz_id: string) {
    const attempts = await db.query.quiz_attempts.findMany({
      where: eq(schema.quiz_attempts.quiz_id, quiz_id),
      with: {
        user: {
          columns: { id: true, name: true, email: true },
        },
      },
    });
    return attempts;
  }
}
