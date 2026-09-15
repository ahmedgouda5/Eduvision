import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.DB_HOST || "db-eduvision",
    port: Number(process.env.DB_PORT) || 5432,
    user: "eduvision",
    password: "Ahmed@123",
    database: "eduvision",
    ssl: false,
  },
});
