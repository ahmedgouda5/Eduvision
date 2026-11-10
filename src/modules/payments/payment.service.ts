import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../../config/config.js";
import * as schema from "../../db/schema/index.js";

type CreatePaymentData = {
  enrollmentId: string;
  amount: number;
  method: "VCASH" | "INSTAPAY";
  senderName: string;
  senderPhone: string;
  transactionNumber: string;
};

const db = drizzle({ client: pool, schema });

export class PaymentService {
  async createPayment(data: CreatePaymentData) {
    const result = await db.insert(schema.payments).values(data).returning();
    return result[0];
  }
}
