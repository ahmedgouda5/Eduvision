import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../../config/config.js";
import * as schema from "../../db/schema/index.js";
import { AppError } from "../../errors/AppError.js";

type PaymentMethod = (typeof schema.paymentMethodEnum.enumValues)[number];

type CreatePaymentData = {
  userId: string;
  enrollmentId: string;
  method: PaymentMethod;
  senderName: string;
  senderPhone: string;
  transactionNumber: string;
};

const db = drizzle({ client: pool, schema });

function isUniqueViolation(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    if ("code" in error && (error as { code?: string }).code === "23505") {
      return true;
    }

    if ("cause" in error) {
      return isUniqueViolation((error as { cause?: unknown }).cause);
    }
  }

  return false;
}

export class PaymentService {
  async createPayment(data: CreatePaymentData) {
    const { userId, enrollmentId, method } = data;
    const senderName = data.senderName?.trim();
    const senderPhone = data.senderPhone?.trim();
    const transactionNumber = data.transactionNumber?.trim();

    if (!enrollmentId) {
      throw new AppError("Enrollment id is required", 400);
    }

    if (!method || !schema.paymentMethodEnum.enumValues.includes(method)) {
      throw new AppError("Invalid payment method", 400);
    }

    if (!senderName || senderName.length > 150) {
      throw new AppError(
        "Sender name is required and must be at most 150 characters",
        400,
      );
    }

    if (!senderPhone || senderPhone.length > 30) {
      throw new AppError(
        "Sender phone is required and must be at most 30 characters",
        400,
      );
    }

    if (!transactionNumber || transactionNumber.length > 100) {
      throw new AppError(
        "Transaction number is required and must be at most 100 characters",
        400,
      );
    }

    const enrollment = await db.query.enrollments.findFirst({
      where: eq(schema.enrollments.id, enrollmentId),
      with: { course: true },
    });

    if (!enrollment) {
      throw new AppError("Enrollment not found", 404);
    }

    if (enrollment.userId !== userId) {
      throw new AppError("You are not allowed to pay for this enrollment", 403);
    }

    const existingPayment = await db.query.payments.findFirst({
      where: eq(schema.payments.transactionNumber, transactionNumber),
    });

    if (existingPayment) {
      throw new AppError("Transaction number has already been used", 409);
    }

    try {
      const result = await db
        .insert(schema.payments)
        .values({
          enrollmentId,
          amount: enrollment.course.price,
          method,
          senderName,
          senderPhone,
          transactionNumber,
        })
        .returning();

      return result[0];
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("Transaction number has already been used", 409);
      }

      throw error;
    }
  }

  async getAllPayments() {
    return db.select().from(schema.payments);
  }
}
