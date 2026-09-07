import { and, eq } from "drizzle-orm";
import { pool } from "../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { lessons } from "../db/schema/lessons.js";

const db = drizzle({ client: pool });

export class LessonsService {
  async addLesson(data: {
    course_id: string;
    title: string;
    duration_sec: number;
  }) {
    const result = await db.insert(lessons).values(data).returning();
    return result[0];
  }

  async getAllLessons() {
    const result = await db.select().from(lessons);
    return result;
  }

  async getLessonsByCourse(course_id: string) {
    const result = await db
      .select()
      .from(lessons)
      .where(eq(lessons.course_id, course_id));
    return result;
  }

  async getLessonById(id: string) {
    const result = await db.select().from(lessons).where(eq(lessons.id, id));
    return result[0];
  }

  async updateLesson(
    id: string,
    course_id: string,
    data: Partial<{ title: string; duration_sec: number }>
  ) {
    const result = await db
      .update(lessons)
      .set(data)
      .where(and(eq(lessons.id, id), eq(lessons.course_id, course_id)))
      .returning();
    return result[0];
  }

  async deleteLesson(id: string, course_id: string) {
    const result = await db
      .delete(lessons)
      .where(and(eq(lessons.id, id), eq(lessons.course_id, course_id)))
      .returning();
    return result[0];
  }
}