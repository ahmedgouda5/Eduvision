import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { quizzes } from "./quizzes.js";
import { options } from "./options.js";

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quiz_id: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id),
  question_text: varchar("question_text", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [questions.quiz_id],
    references: [quizzes.id],
  }),
}));