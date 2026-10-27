import { eq } from "drizzle-orm";
import { pool } from "../../config/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { AppError } from "../../errors/AppError.js";
import { users } from "../../db/schema/users.js";
import { comparePassword, hashPassword } from "../../utils/hashedPassword.js";
import { serialize } from "node:v8";

const db = drizzle({ client: pool });

// ! @desc    AuthService class to handle user authentication and management
export class AuthService {
  //! @desc    Add a new user
  //! @param   data - User data including name, email, password, and role
  //! @returns The newly created user
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

  //! @desc    Login a user
  //! @param   data - User login data including email and password
  //! @returns The authenticated user
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

  //! @desc    Get all users
  //! @returns A list of all users
  async getAllUsers() {
    const result = await db.select().from(users);
    return result;
  }

  //! @desc    Delete a user
  //! @param   id - The ID of the user to delete
  //! @returns The deleted user
  async deleteUser(id: string) {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result[0];
  }

  //! @desc    Update a user
  //! @param   id - The ID of the user to update
  //! @param   data - The updated user data
  //! @returns The updated user
  async updateUser(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      password: string;
    }>,
  ) {
    const { password, ...safeData } = data;

    const updateData = {
      ...safeData,
      ...(password && {
        password: await hashPassword(password),
      }),
    };

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    return result[0];
  }
}
