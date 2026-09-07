import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { questions } from "./questions.js";

export const options = pgTable("options", {
  id: uuid("id").defaultRandom().primaryKey(),
  question_id: uuid("question_id")
    .notNull()
    .references(() => questions.id),
  option_text: varchar("option_text", { length: 500 }).notNull(),
  is_correct: boolean("is_correct").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, {
    fields: [options.question_id],
    references: [questions.id],
  }),
}));