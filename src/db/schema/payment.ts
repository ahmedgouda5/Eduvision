import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { enrollments } from "./Enrollments.js";
import { relations } from "drizzle-orm";

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "VCASH",
  "INSTAPAY",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),

    // القيمة بالقروش: 50000 = 500 جنيه.
    amount: integer("amount").notNull(),

    method: paymentMethodEnum("method").notNull(),

    senderName: varchar("sender_name", { length: 150 }).notNull(),
    senderPhone: varchar("sender_phone", { length: 30 }).notNull(),
    transactionNumber: varchar("transaction_number", {
      length: 100,
    }).notNull(),

    status: paymentStatusEnum("status").notNull().default("PENDING"),

    adminNote: varchar("admin_note", { length: 500 }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payments_enrollment_id_idx").on(table.enrollmentId),
    index("payments_status_idx").on(table.status),
  ],
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  enrollment: one(enrollments, {
    fields: [payments.enrollmentId],
    references: [enrollments.id],
  }),
}));
