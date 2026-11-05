import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { courses } from "./courses.js";

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    course_id: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),

    status: enrollmentStatusEnum("status").default("PENDING").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("enrollments_user_course_unique").on(table.user_id, table.course_id),
    index("enrollments_course_id_idx").on(table.course_id),
  ],
);

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.user_id],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.course_id],
    references: [courses.id],
  }),
}));
