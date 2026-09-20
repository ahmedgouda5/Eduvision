import { and, eq } from "drizzle-orm";
import { pool } from "../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema/index.js";

const db = drizzle({ client: pool, schema });

export class CourseService {
  async addCourse(data: { title: string; price: number; admin_id: string }) {
    const result = await db.insert(schema.courses).values(data).returning();
    return result[0];
  }

  async getAllCourses() {
    const result = await db.query.courses.findMany({
      with: {
        lessons: {
          with: {
            quiz: {
              with: {
                questions: {
                  with: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return result;
  }

  async getCourseById(id: string) {
    const result = await db.query.courses.findFirst({
      where: eq(schema.courses.id, id),
      with: {
        lessons: {
          with: {
            quiz: {
              with: {
                questions: {
                  with: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return result;
  }

  async updateCourse(
    id: string,
    admin_id: string,
    data: Partial<{ title: string; price: number }>,
  ) {
    const result = await db
      .update(schema.courses)
      .set(data)
      .where(
        and(eq(schema.courses.id, id), eq(schema.courses.admin_id, admin_id)),
      )
      .returning();
    return result[0];
  }

  async deleteCourse(id: string, admin_id: string) {
    const result = await db
      .delete(schema.courses)
      .where(
        and(eq(schema.courses.id, id), eq(schema.courses.admin_id, admin_id)),
      )
      .returning();
    return result[0];
  }
}
