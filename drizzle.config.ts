import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: "localhost",
    port: 5433,
    user: "eduvision",
    password: "Ahmed@123",
    database: "eduvision",
    ssl: false,
  },
});
