import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { quizzes } from "./quizzes.js";

export const quiz_attempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    quiz_id: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),

    // Number of correct answers (e.g. 8 out of 10)
    score: integer("score").notNull(),

    attempted_at: timestamp("attempted_at").defaultNow().notNull(),
  },
  // A student can only attempt each quiz once
  (table) => [unique("unique_user_quiz").on(table.user_id, table.quiz_id)],
);

export const quizAttemptsRelations = relations(quiz_attempts, ({ one }) => ({
  user: one(users, {
    fields: [quiz_attempts.user_id],
    references: [users.id],
  }),
  quiz: one(quizzes, {
    fields: [quiz_attempts.quiz_id],
    references: [quizzes.id],
  }),
}));
