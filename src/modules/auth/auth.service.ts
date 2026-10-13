import { randomInt } from "crypto";
import { eq } from "drizzle-orm";
import { pool } from "../../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { AppError } from "../../errors/AppError.js";
import { users } from "../../db/schema/users.js";
import { redis } from "../../config/redis.js";
import { sendOtpEmail } from "../../utils/email.js";
import { comparePassword, hashPassword } from "../../utils/hashedPassword.js";

const db = drizzle({ client: pool });

export class AuthService {
  async addUser(data: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "student";
  }) {
    const hashedPassword = await hashPassword(data.password);
    const result = await db
      .insert(users)
      .values({ ...data, password: hashedPassword })
      .returning();
    return result[0];
  }

  async login(data: { email: string; password: string }) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email));
    const user = result[0];

    if (!user || !(await comparePassword(data.password, user.password))) {
      throw new AppError("Invalid email or password", 401);
    }

    return user;
  }

  async verifyLoginOtp(userId: string, otp: string) {
    const storedOtp = await redis.get(`login:otp:${userId}`);

    if (!storedOtp) {
      throw new AppError("OTP expired", 401);
    }

    if (storedOtp !== otp) {
      throw new AppError("Invalid OTP", 401);
    }

    await redis.del(`login:otp:${userId}`);

    const result = await db.select().from(users).where(eq(users.id, userId));
    const user = result[0];

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async getAllUsers() {
    const result = await db.select().from(users);
    return result;
  }

  async deleteUser(id: string) {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result[0];
  }

  async updateUser(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      password: string;
      role: "admin" | "student";
    }>,
  ) {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
}
