import { and, eq } from "drizzle-orm";
import { pool } from "../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { quizzes } from "../db/schema/quizzes.js";

const db = drizzle({ client: pool });

export class QuizzesService {
  async addQuiz(data: { lesson_id: string; title: string }) {
    const result = await db.insert(quizzes).values(data).returning();
    return result[0];
  }

  async getAllQuizzes() {
    const result = await db.select().from(quizzes);
    return result;
  }

  async getQuizById(id: string) {
    const result = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return result[0];
  }

  async getQuizByLesson(lesson_id: string) {
    const result = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.lesson_id, lesson_id));
    return result[0];
  }

  async updateQuiz(
    id: string,
    lesson_id: string,
    data: Partial<{ title: string }>
  ) {
    const result = await db
      .update(quizzes)
      .set(data)
      .where(and(eq(quizzes.id, id), eq(quizzes.lesson_id, lesson_id)))
      .returning();
    return result[0];
  }

  async deleteQuiz(id: string, lesson_id: string) {
    const result = await db
      .delete(quizzes)
      .where(and(eq(quizzes.id, id), eq(quizzes.lesson_id, lesson_id)))
      .returning();
    return result[0];
  }
}