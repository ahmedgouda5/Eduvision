import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  price: integer("price").notNull(),
  admin_id: integer("admin_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coursesRelations = relations(courses, ({ one }) => ({
  admin: one(users, {
    fields: [courses.admin_id],
    references: [users.id],
  }),
}));
