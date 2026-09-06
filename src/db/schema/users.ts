import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "student"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("student"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
