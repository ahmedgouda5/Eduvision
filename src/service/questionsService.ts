import { and, eq } from "drizzle-orm";
import { pool } from "../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { questions } from "../db/schema/questions.js";

const db = drizzle({ client: pool });

export class QuestionsService {
  async addQuestion(data: { quiz_id: string; question_text: string }) {
    const result = await db.insert(questions).values(data).returning();
    return result[0];
  }

  async getAllQuestions() {
    const result = await db.select().from(questions);
    return result;
  }

  async getQuestionsByQuiz(quiz_id: string) {
    const result = await db
      .select()
      .from(questions)
      .where(eq(questions.quiz_id, quiz_id));
    return result;
  }

  async getQuestionById(id: string) {
    const result = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id));
    return result[0];
  }

  async updateQuestion(
    id: string,
    quiz_id: string,
    data: Partial<{ question_text: string }>
  ) {
    const result = await db
      .update(questions)
      .set(data)
      .where(and(eq(questions.id, id), eq(questions.quiz_id, quiz_id)))
      .returning();
    return result[0];
  }

  async deleteQuestion(id: string, quiz_id: string) {
    const result = await db
      .delete(questions)
      .where(and(eq(questions.id, id), eq(questions.quiz_id, quiz_id)))
      .returning();
    return result[0];
  }
}