import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { courses } from "./courses.js";
import { users } from "./users.js";
import { relations } from "drizzle-orm";
import { payments } from "./payment.js";

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "PENDING",
  "APPROVED",
  "SUSPENDED",
]);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),

    status: enrollmentStatusEnum("status").notNull().default("PENDING"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("enrollments_user_course_unique").on(table.userId, table.courseId),
    index("enrollments_course_id_idx").on(table.courseId),
  ],
);

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),

  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),

  payments: many(payments),
}));
