import { and, eq } from "drizzle-orm";
import { pool } from "../../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema/index.js";
import { AppError } from "../../errors/AppError.js";

type Idata = {
  userId: string;
  courseId: string;
};

const db = drizzle({ client: pool, schema });

export class EnrollmentService {
  async createEnrollment(enrollmentData: Idata): Promise<any> {
    const { userId, courseId } = enrollmentData;

    const course = await db.query.courses.findFirst({
      where: eq(schema.courses.id, courseId),
    });

    if (!course) {
      throw new AppError("Course not found", 404);
    }

    const existingEnrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(schema.enrollments.userId, userId),
        eq(schema.enrollments.courseId, courseId),
      ),
    });

    if (existingEnrollment) {
      throw new AppError("User is already enrolled in this course", 409);
    }

    const result = await db
      .insert(schema.enrollments)
      .values({ userId, courseId, status: "PENDING" })
      .returning();

    return result[0];
  }

  async getAllEnrollments() {
    const result = await db.select().from(schema.enrollments);
    return result;
  }
}
