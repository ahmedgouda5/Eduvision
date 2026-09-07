import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { courses } from "./courses.js";
import { quizzes } from "./quizzes.js";

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  course_id: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  title: varchar("title", { length: 255 }).notNull(),
  duration_sec: integer("duration_sec").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.course_id],
    references: [courses.id],
  }),
  quiz: one(quizzes),
}));