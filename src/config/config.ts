import { Pool } from "pg";

export const pool = new Pool({
  host: "db",
  port: 5432,
  user: "eduvision",
  password: "Ahmed@123",
  database: "eduvision",
});
