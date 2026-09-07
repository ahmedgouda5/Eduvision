import { eq } from "drizzle-orm";
import { pool } from "../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { users } from "../db/schema/users.js";

const db = drizzle({ client: pool });

export class AuthService {
  async addUser(data: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "student";
  }) {
    const result = await db.insert(users).values(data).returning();
    return result[0];
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
    }>
  ) {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
}
