import { and, eq } from "drizzle-orm";
import { pool } from "../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { options } from "../db/schema/options.js";

const db = drizzle({ client: pool });

export class OptionsService {
  async addOption(data: {
    question_id: string;
    option_text: string;
    is_correct: boolean;
  }) {
    const result = await db.insert(options).values(data).returning();
    return result[0];
  }

  async getAllOptions() {
    const result = await db.select().from(options);
    return result;
  }

  async getOptionsByQuestion(question_id: string) {
    const result = await db
      .select()
      .from(options)
      .where(eq(options.question_id, question_id));
    return result;
  }

  async getOptionById(id: string) {
    const result = await db.select().from(options).where(eq(options.id, id));
    return result[0];
  }

  async checkAnswer(question_id: string, option_id: string) {
    const correctOption = await db
      .select()
      .from(options)
      .where(
        and(eq(options.question_id, question_id), eq(options.is_correct, true))
      );
    const correct = correctOption[0];
    const isCorrect =
      correct !== undefined && correct.id === option_id;
    return { isCorrect, correctOptionId: correct?.id ?? null };
  }

  async updateOption(
    id: string,
    question_id: string,
    data: Partial<{ option_text: string; is_correct: boolean }>
  ) {
    const result = await db
      .update(options)
      .set(data)
      .where(and(eq(options.id, id), eq(options.question_id, question_id)))
      .returning();
    return result[0];
  }

  async deleteOption(id: string, question_id: string) {
    const result = await db
      .delete(options)
      .where(and(eq(options.id, id), eq(options.question_id, question_id)))
      .returning();
    return result[0];
  }
}