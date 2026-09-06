import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: "db",
    port: 5432,
    user: "eduvision",
    password: "Ahmed@123",
    database: "eduvision",
    ssl: false,
  },
});
