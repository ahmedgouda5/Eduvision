import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST || "db-eduvision",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "eduvision",
  password: process.env.DB_PASSWORD || "Ahmed@123",
  database: process.env.DB_NAME || "eduvision",
});

