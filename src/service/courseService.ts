import { and, eq } from "drizzle-orm";
import { pool } from "../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { courses } from "../db/schema/courses.js";

const db = drizzle({ client: pool });

export class CourseService {
  async addCourse(data: { title: string; price: number; admin_id: string }) {
    const result = await db.insert(courses).values(data).returning();
    return result[0];
  }

  async getAllCourses() {
    const result = await db.select().from(courses);
    return result;
  }

  async getCourseById(id: string) {
    const result = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id));
    return result[0];
  }

  async updateCourse(
    id: string,
    admin_id: string,
    data: Partial<{ title: string; price: number }>
  ) {
    const result = await db
      .update(courses)
      .set(data)
      .where(and(eq(courses.id, id), eq(courses.admin_id, admin_id)))
      .returning();
    return result[0];
  }

  async deleteCourse(id: string, admin_id: string) {
    const result = await db
      .delete(courses)
      .where(and(eq(courses.id, id), eq(courses.admin_id, admin_id)))
      .returning();
    return result[0];
  }
}