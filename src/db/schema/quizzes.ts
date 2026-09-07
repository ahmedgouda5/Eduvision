import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { lessons } from "./lessons.js";
import { questions } from "./questions.js";

export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  lesson_id: uuid("lesson_id")
    .notNull()
    .unique()
    .references(() => lessons.id),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [quizzes.lesson_id],
    references: [lessons.id],
  }),
  questions: many(questions),
}));