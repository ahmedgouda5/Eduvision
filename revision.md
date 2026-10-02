# EduVision Backend — Engineering Review

> **Reviewer:** Senior Software Engineer / Architect  
> **Date:** 2026-09-20  
> **Codebase:** `a:\projects\EduVision\backend`  
> **Stack:** Node.js · Express 5 · TypeScript · Drizzle ORM · PostgreSQL · JWT · Docker

---

## Table of Contents

1. [System Design Review](#1-system-design-review)
2. [Architecture Review](#2-architecture-review)
3. [Security Review](#3-security-review)
4. [Scalability Review](#4-scalability-review)
5. [Maintainability Review](#5-maintainability-review)
6. [Performance Review](#6-performance-review)
7. [Reliability & Error Handling Review](#7-reliability--error-handling-review)
8. [Database Review](#8-database-review)
9. [Testing Review](#9-testing-review)
10. [Overall Engineering Assessment](#10-overall-engineering-assessment)
11. [Recommended Roadmap](#11-recommended-roadmap)
12. [Final Scorecard](#12-final-scorecard)

---

## 1. System Design Review

### System Overview

EduVision is a course-management REST API. It models a strict hierarchy:

```
Users → Courses → Lessons → Quizzes → Questions → Options
```

Users are either `admin` (create/manage content) or `student` (consume content, check answers). The API is a JSON REST service backed by PostgreSQL via Drizzle ORM.

### Main Components

| Component | Responsibility |
|---|---|
| `server.ts` | Express app bootstrap, route mounting, 404 handler + error handler registration |
| `router/` | Route definitions with middleware wiring |
| `controller/` | Request parsing, response formatting |
| `service/` | Business logic + Drizzle ORM queries |
| `db/schema/` | Drizzle table definitions + relations |
| `middlewares/` | Auth, async error catching, centralized error handler |
| `config/config.ts` | `pg.Pool` instantiation |
| `utils/token.ts` | JWT signing |
| `errors/AppError.ts` | Typed operational error class |

### Request / Response Flow

```
Client
  → HTTP Request
  → Express Router
  → authenticate middleware (JWT verification)
  → authorize middleware (role check)
  → asyncHandler wrapper
  → Controller (parse body / params)
  → Service (Drizzle query → PostgreSQL)
  ← Service (typed result)
  ← Controller (JSON response)
  ← HTTP Response

On error → next(err) → errorHandler middleware → structured JSON error response
```

### Assessment

The design is **appropriate for the project's current size**. A straightforward REST API with clearly-scoped resources is the right choice for an educational platform at this scale. There is no over-engineering and no premature abstraction.

However, several **systemic gaps** must be addressed before production:

1. **No input validation layer** — requests hit the database with raw, unvalidated `req.body`.
2. **No password hashing** — passwords are stored and compared in plain text.
3. **Hardcoded credentials committed to the repository.**
4. **No pagination** on any list endpoint.
5. **Multiple independent `drizzle()`/`pool` instances** created per service file.
6. **Port hardcoded** in `server.ts` — cannot be configured without a code change.

---

## 2. Architecture Review

### Folder Structure

```
src/
├── config/         # DB pool — single file
├── controller/     # Express request handlers
├── db/schema/      # Drizzle table schemas + relations
├── errors/         # AppError class
├── middlewares/    # asyncHandler, auth, errorHandler
├── router/         # Route definitions
├── service/        # Business logic + DB queries
└── utils/          # Token utility
server.ts
```

### Identified Architectural Patterns

- **Layered Architecture**: Router → Controller → Service → Data (Drizzle/PostgreSQL). Correctly implemented.
- **Centralized Error Handling**: `AppError` + `errorHandler` middleware. Solid foundation.
- **Wrapper Pattern**: `asyncHandler` prevents unhandled async rejections from crashing the server.

---

### Issue 2.1 — `drizzle()` Instantiated Separately in Every Service File

**What is wrong?**  
Every service file calls `drizzle({ client: pool })` independently:
- `userService.ts` line 7
- `lessonsService.ts` line 6
- `quizzesService.ts` line 6
- `questionsService.ts` line 6
- `optionsService.ts` line 6
- `courseService.ts` line 6 (the only one passing `schema`)

**Why is it a problem?**  
It creates a maintenance hazard: if Drizzle's configuration changes, every file must be updated. More critically, only `courseService.ts` passes `schema`, so only it can use Drizzle's relational `db.query` API. All other services are limited to the basic query builder. This makes query capabilities inconsistent across the codebase.

**Where does it exist?**  
All six `src/service/*.ts` files.

**Recommended solution:**  
Create a single `src/db/db.ts` file:
```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../config/config.js";
import * as schema from "./schema/index.js";

export const db = drizzle({ client: pool, schema });
```
All services import `db` from there.

**What improves?**  
Single source of truth for the DB client. Consistent relational query capability everywhere. Schema changes only need updating in one place.

---

### Issue 2.2 — `AuthService` Is a Misleading Name

**What is wrong?**  
`src/service/userService.ts` exports `AuthService`, but it also handles `getAllUsers`, `updateUser`, `deleteUser` — operations well beyond authentication.

**Why is it a problem?**  
A new developer looking for user-management logic won't know where to find it.

**Where does it exist?**  
`src/service/userService.ts` line 9.

**Recommended solution:**  
Rename `AuthService` → `UserService`. The `login` method stays in the same class.

**What improves?**  
Clearer naming; easier navigation.

---

### Issue 2.3 — Port Hardcoded in `server.ts`

**What is wrong?**  
`server.ts` line 28: `app.listen(4000, () => { ... })`.

**Why is it a problem?**  
Violates 12-factor app principles. Cannot be configured at runtime.

**Where does it exist?**  
`src/server.ts` line 28.

**Recommended solution:**  
```typescript
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**What improves?**  
Runtime configurability without code changes.

---

## 3. Security Review

---

### 🔴 CRITICAL — Issue 3.1: Plain-Text Password Storage and Comparison

**What is wrong?**  
- `userService.ts` line 16: `db.insert(users).values(data)` — `data.password` is the raw string from `req.body`.
- `userService.ts` line 24: `user.password !== data.password` — plain-text equality check.

**Why is it a problem?**  
If the database is ever breached (SQL injection, compromised credentials, backup leak), every user's real password is immediately exposed.

**Where does it exist?**  
`src/service/userService.ts` lines 16, 24.

**Attack scenario:**  
Attacker gains read access to the `users` table → every user's real password is available in plain text.

**Recommended solution:**
```typescript
import bcrypt from "bcrypt";

// Registration
const hash = await bcrypt.hash(data.password, 12);
await db.insert(users).values({ ...data, password: hash }).returning();

// Login
const isMatch = await bcrypt.compare(data.password, user.password);
if (!user || !isMatch) throw new AppError("Invalid email or password", 401);
```
Also increase `password` column length if needed (bcrypt hashes are 60 chars, argon2 can be longer).

**What improves?**  
Credentials are safe even on a full database breach.

---

### 🔴 CRITICAL — Issue 3.2: Hardcoded Database Password and JWT Secret in Source Code

**What is wrong?**  
- `src/config/config.ts` line 7: `password: process.env.DB_PASSWORD || "Ahmed@123"`
- `drizzle.config.ts` lines 10–11: `user: "eduvision"` / `password: "Ahmed@123"` — **hardcoded with no env fallback**
- `src/middlewares/auth.ts` line 5: `const SECRET = process.env.JWT_SECRET || "eduvision-secret"`
- `src/utils/token.ts` line 3: `const SECRET = process.env.JWT_SECRET || "eduvision-secret"`
- `docker-compose.yml` lines 23–25: credentials in plain text

**Why is it a problem?**  
The credentials exist in git history. Anyone with repository access (or if the repo is public) has the DB password. The fallback JWT secret `"eduvision-secret"` allows anyone to forge valid tokens for any user with any role.

**Where does it exist?**  
`src/config/config.ts`, `drizzle.config.ts`, `src/middlewares/auth.ts`, `src/utils/token.ts`, `docker-compose.yml`.

**Attack scenario:**  
1. Attacker reads the repo → connects to the exposed DB port (5433) with `eduvision`/`Ahmed@123` → full database read/write access.
2. Attacker crafts a JWT signed with `"eduvision-secret"` → impersonates any user with `role: "admin"`.

**Recommended solution:**  
1. Remove all hardcoded fallback values. Fail at startup if required env vars are missing:
```typescript
if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required");
}
if (!process.env.DB_PASSWORD) {
  throw new Error("FATAL: DB_PASSWORD environment variable is required");
}
```
2. Create a `.env` file (already gitignored) for local dev. Create a `.env.example` for documentation.
3. For `drizzle.config.ts`, use `process.env.DB_USER`, `process.env.DB_PASSWORD`, etc.
4. Add `env_file: - .env` to the app service in `docker-compose.yml`.
5. **Rotate the existing credentials immediately.**

**What improves?**  
No credentials in source control. Deployment environments supply their own secrets.

---

### 🔴 CRITICAL — Issue 3.3: Password Field Returned in API Responses

**What is wrong?**  
- `authController.ts` line 12: `res.status(201).json({ success: true, data: user, token })` — `user` is the raw DB row including the `password` field.
- Same in `deleteUser` (line 36) and `updateUser` (line 45).

**Why is it a problem?**  
The password (currently plain text — see Issue 3.1) is transmitted to the client in every auth response. Even after hashing is added, leaking the hash is a security risk.

**Where does it exist?**  
`src/controller/authController.ts` lines 12, 36, 45.

**Recommended solution:**  
Omit the `password` field before sending:
```typescript
const { password, ...safeUser } = user;
res.status(201).json({ success: true, data: safeUser, token });
```
Or create a reusable `sanitizeUser(user)` helper that explicitly selects safe fields.

**What improves?**  
Credentials never leave the server.

---

### 🔴 CRITICAL — Issue 3.4: Privilege Escalation via Mass Assignment on `updateUser`

**What is wrong?**  
`authController.ts` line 41: `authService.updateUser(id, req.body)` — the entire request body is passed to the service, which then does `db.update(users).set(data)`.

**Why is it a problem?**  
A client can include `{ "role": "admin" }` in the PATCH body and promote themselves to admin. This is a confirmed privilege escalation vulnerability.

**Where does it exist?**  
`src/controller/authController.ts` line 41; `src/service/userService.ts` line 52.

**Attack scenario:**  
Authenticated student sends `PATCH /api/auth/:their_id` with body `{ "role": "admin" }` → they are now admin.

**Recommended solution:**  
1. Explicitly whitelist fields allowed in the update body (never include `role`).
2. Validate with a Zod schema:
```typescript
const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  // role is NOT included
});
```

**What improves?**  
Eliminates privilege escalation. Input validation also prevents garbage data from reaching the database.

---

### 🟡 HIGH — Issue 3.5: No Input Validation on Any Endpoint

**What is wrong?**  
Every controller passes `req.body` directly to the service layer without validation:
- `authController.ts` line 10: `authService.addUser(req.body)` — no check for `name`, `email`, `password`, `role`.
- `courseController.ts` lines 10–14: reads `req.body.title` and `req.body.price` without type checks.
- `lessonsController.ts` lines 9–13: no validation on `course_id`, `title`, `duration_sec`.
- The only manual validation exists in `optionsController.ts` lines 10–12 for `checkAnswer`.

**Why is it a problem?**  
Malformed data can cause PostgreSQL errors (leaking schema info in error messages), silent data corruption, or unexpected behavior. Without validation there is also no defense against undersized/oversized strings.

**Where does it exist?**  
All controllers. All services.

**Recommended solution:**  
Use `zod` for schema validation. Define a DTO schema for each request body:
```typescript
// src/validators/courseValidator.ts
import { z } from "zod";
export const createCourseSchema = z.object({
  title: z.string().min(1).max(255),
  price: z.number().int().nonnegative(),
});
```
Parse and validate before calling the service. Validation errors should be caught and returned as `400 Bad Request`.

**What improves?**  
Type safety at the boundary. Consistent error messages. Eliminates garbage data reaching the DB.

---

### 🟡 HIGH — Issue 3.6: `getBearerToken` Dead-Code Logic Bug

**What is wrong?**  
`src/middlewares/auth.ts` lines 16–20:
```typescript
function getBearerToken(req: Request): string | undefined {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : req.headers.authorization?.split(" ")[1]; // ← same result; always splits
}
```
The `else` branch also calls `.split(" ")[1]`, meaning if someone sends `Authorization: Basic dXNlcjpwYXNz`, the code extracts `dXNlcjpwYXNz` and passes it to `jwt.verify()` (which rejects it, but the logic is wrong).

**Why is it a problem?**  
Incorrect logic. The intent was clearly to return `undefined` for non-Bearer tokens. It signals the code was not carefully reviewed.

**Where does it exist?**  
`src/middlewares/auth.ts` lines 16–20.

**Recommended solution:**
```typescript
function getBearerToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.split(" ")[1];
  }
  return undefined;
}
```

**What improves?**  
Correct behavior; non-Bearer tokens are rejected as unauthenticated.

---

### 🟡 HIGH — Issue 3.7: JWT Secret Duplicated in Two Files

**What is wrong?**  
`const SECRET = process.env.JWT_SECRET || "eduvision-secret"` exists in both:
- `src/middlewares/auth.ts` line 5
- `src/utils/token.ts` line 3

**Why is it a problem?**  
If the secret logic changes (e.g., removing the fallback), both files must be updated independently. Easy to miss one.

**Where does it exist?**  
`src/middlewares/auth.ts` line 5; `src/utils/token.ts` line 3.

**Recommended solution:**  
Export `JWT_SECRET` from `src/config/config.ts` (or a dedicated `src/config/env.ts` that validates required env vars) and import it in both files.

**What improves?**  
Single source of truth for configuration.

---

### 🟡 HIGH — Issue 3.8: Students Can Delete Any User (IDOR)

**What is wrong?**  
`src/router/authRouter.ts` line 16:
```typescript
router.delete("/:id", authenticate, authorize("admin", "student"), deleteUser);
```
A student can call `DELETE /api/auth/:any_user_id` and delete any other user — including admins.

**Why is it a problem?**  
Insecure Direct Object Reference (IDOR). A student should only be able to delete their own account.

**Where does it exist?**  
`src/router/authRouter.ts` line 16; `src/controller/authController.ts` lines 30–37.

**Attack scenario:**  
Authenticated student sends `DELETE /api/auth/:admin_user_id` → admin account is deleted.

**Recommended solution:**  
Add an ownership check in `deleteUser`:
```typescript
export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = req.params.id;
  const caller = req.user!;
  // Students can only delete their own account
  if (caller.role === "student" && caller.id !== id) {
    throw new AppError("Forbidden", 403);
  }
  const user = await authService.deleteUser(id);
  if (!user) throw new AppError("User not found", 404);
  const { password, ...safeUser } = user;
  res.status(200).json({ success: true, data: safeUser });
});
```

**What improves?**  
Eliminates unauthorized deletion. Matches the principle of least privilege.

---

### 🟡 HIGH — Issue 3.9: No Rate Limiting

**What is wrong?**  
`/api/auth/login` and `/api/auth/register` have no rate limiting.

**Why is it a problem?**  
Unlimited login attempts enable brute-force attacks against user passwords (doubly critical once passwords are hashed, as rate limiting is then the primary defense). Unlimited registration enables spam account creation.

**Where does it exist?**  
`src/router/authRouter.ts` lines 13–14.

**Recommended solution:**
```typescript
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: "Too many requests, please try again later." },
});

router.post("/login", authLimiter, login);
router.post("/register", authLimiter, addUser);
```

**What improves?**  
Drastically reduces brute-force attack surface.

---

### 🟠 MEDIUM — Issue 3.10: Cross-Admin Resource Modification on Sub-Resources

**What is wrong?**  
`updateCourse` and `deleteCourse` correctly filter by `admin_id` (the authenticated user's ID). However, lessons, quizzes, questions, and options use `course_id` / `lesson_id` / `quiz_id` from the **request body** as the ownership filter — not the caller's identity.

Any admin can modify any lesson by knowing (or guessing) the correct `course_id`.

**Why is it a problem?**  
Ownership enforcement is only complete at the course level. Sub-resource modification is not properly scoped to the owner admin.

**Where does it exist?**  
`src/service/lessonsService.ts`, `src/service/quizzesService.ts`, `src/service/questionsService.ts`, `src/service/optionsService.ts`.

**Recommended solution:**  
Before mutating a sub-resource, verify the parent chain leads back to a course owned by the requesting admin. This can be done with a JOIN or a preliminary ownership query.

**What improves?**  
Full ownership enforcement throughout the resource hierarchy.

---

### 🟠 MEDIUM — Issue 3.11: No CORS Configuration

**What is wrong?**  
`server.ts` has no `cors` middleware. There is no control over which origins may access the API.

**Where does it exist?**  
`src/server.ts`.

**Recommended solution:**  
```typescript
import cors from "cors";
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || [] }));
```

**What improves?**  
Explicit control over cross-origin access.

---

### 🟠 MEDIUM — Issue 3.12: No Security Headers (Helmet)

**What is wrong?**  
No `helmet` middleware is used. Missing headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, etc.

**Where does it exist?**  
`src/server.ts`.

**Recommended solution:**  
`app.use(helmet());` (add `helmet` as a dependency).

**What improves?**  
Improved HTTP security posture with minimal effort.

---

### 🟠 MEDIUM — Issue 3.13: No Request Body Size Limit

**What is wrong?**  
`server.ts` line 13: `app.use(express.json())` — no size limit.

**Why is it a problem?**  
A client can send an arbitrarily large JSON payload, causing memory spikes or denial of service.

**Recommended solution:**  
`app.use(express.json({ limit: "10kb" }));`

**What improves?**  
Prevents large payload DoS attacks.

---

### 🟠 MEDIUM — Issue 3.14: No Token Revocation / Short-Lived Tokens

**What is wrong?**  
Tokens are signed with `expiresIn: "7d"` (`src/utils/token.ts` line 6). There is no refresh token mechanism and no revocation strategy.

**Why is it a problem?**  
A stolen token remains valid for 7 full days with no way to invalidate it.

**Where does it exist?**  
`src/utils/token.ts` line 6.

**Recommended solution:**  
At minimum, reduce access token lifetime to `1h` and implement a refresh token endpoint. For immediate mitigation, `expiresIn: "1d"` is a reasonable compromise.

**What improves?**  
Reduces the window of exposure if a token is compromised.

---

## 4. Scalability Review

---

### Issue 4.1 — `getAllCourses` Performs a Deeply Nested Eager Load With No Pagination (High Impact)

**What is wrong?**  
`courseService.ts` lines 14–33:
```typescript
db.query.courses.findMany({
  with: {
    lessons: {
      with: {
        quiz: {
          with: {
            questions: {
              with: { options: true }
            }
          }
        }
      }
    }
  }
})
```
This loads the **entire** course catalog with every lesson, every quiz, every question, and every option.

**Why is it a problem?**  
With 100 courses × 10 lessons × 10 questions × 4 options = ~40,000 records loaded per request. Response payloads could be megabytes. Drizzle's relational API issues multiple round-trips to the DB per nesting level.

**Current behavior:**  
Every call to `GET /api/courses` loads the full object graph.

**Expected impact:**  
High — this is the main listing endpoint.

**Possible solution:**  
1. Add pagination (`limit`/`offset` query params).
2. Return only course-level fields (title, price, id, createdAt) by default.
3. The existing `GET /api/courses/:id` can return one level deeper (with lessons).
4. Dedicated endpoints for quizzes/questions can handle further drill-down.

---

### Issue 4.2 — All "Get All" Endpoints Are Unbounded

**What is wrong?**  
- `lessonsService.ts` line 18: `db.select().from(lessons)` — no LIMIT
- `quizzesService.ts` line 14: `db.select().from(quizzes)` — no LIMIT
- `questionsService.ts` line 14: `db.select().from(questions)` — no LIMIT
- `optionsService.ts` line 18: `db.select().from(options)` — no LIMIT
- `userService.ts` line 32: `db.select().from(users)` — no LIMIT

**Why is it a problem?**  
As content grows these endpoints become progressively slower and more memory-intensive. A table with 10,000 questions returns all 10,000 rows in a single response.

**Possible solution:**  
Add `limit` and `offset` query parameters to all list endpoints. If these "get all" endpoints are only for admin tooling, restrict them and add pagination.

---

### Issue 4.3 — No Database Indexes on Foreign Key Columns

**What is wrong?**  
No secondary indexes on columns used in `WHERE` clauses:
- `courses.admin_id` — used in `updateCourse`, `deleteCourse`
- `lessons.course_id` — used in `getLessonsByCourse`
- `questions.quiz_id` — used in `getQuestionsByQuiz`
- `options.question_id` — used in `getOptionsByQuestion`, `checkAnswer`

**Why is it a problem?**  
PostgreSQL does not automatically index foreign key columns. Without indexes, filtered queries perform full table scans as data grows.

**Possible solution:**  
Add `.index()` declarations in the Drizzle schema:
```typescript
// In options.ts
export const options = pgTable(
  "options",
  { ... },
  (t) => [index("options_question_id_idx").on(t.question_id)]
);
```

---

### Issue 4.4 — No Caching Layer

**What is wrong?**  
Every request hits PostgreSQL, even for data that rarely changes (course listings, lesson lists).

**Why is it a problem?**  
At low traffic this is fine, but course listings under load will put constant read pressure on the database.

**Possible solution:**  
For Phase 3: add Redis caching for course/lesson listings with a short TTL (e.g., 60 seconds). Not urgent now.

---

### Issue 4.5 — `checkAnswer` Does Not Enforce One Correct Option Per Question

**What is wrong?**  
`optionsService.ts` lines 37–45: queries `WHERE question_id = ? AND is_correct = true`. There is no unique constraint on `(question_id, is_correct = true)`. An admin could accidentally create two correct options for one question, making `correctOption[0]` return an arbitrary one.

**Why is it a problem?**  
The answer-checking logic silently becomes unreliable. This is a business rule that belongs in the schema.

**Possible solution:**  
Add a partial unique index: `CREATE UNIQUE INDEX one_correct_per_question ON options(question_id) WHERE is_correct = true;`

In Drizzle this can be expressed with a custom index on the table.

---

## 5. Maintainability Review

---

### Issue 5.1 — No Input/Output Type Contracts (DTOs)

**What is wrong?**  
Controllers read `req.body` without typed interfaces. TypeScript has no visibility into the shape of incoming requests. A typo like `req.body.cours_id` instead of `req.body.course_id` passes type checking silently.

**Recommended solution:**  
Define explicit Zod schemas that double as TypeScript types:
```typescript
const createLessonSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  duration_sec: z.number().int().positive(),
});
type CreateLessonDto = z.infer<typeof createLessonSchema>;
```

---

### Issue 5.2 — Ownership Filtering via `req.body` (Design Inconsistency)

**What is wrong?**  
`updateLesson` (line 40) and `deleteLesson` (line 52) in `lessonsController.ts` read `req.body.course_id` as the ownership filter passed to the service. The same pattern appears in:
- `quizzesController.ts` lines 41, 51
- `questionsController.ts` lines 37, 48
- `optionsController.ts` lines 48, 59

**Why is it a problem?**  
If the client omits `course_id` from the body, the `WHERE` clause becomes `AND course_id = undefined` (or NULL in SQL), which matches nothing. The service returns `undefined`, and the controller throws `"Lesson not found"` — a misleading error for data that actually exists.

**Recommended solution:**  
The parent ID should come from a URL parameter (e.g., `/api/lessons/:id?course_id=...` is awkward; better: derive ownership server-side via a join on the authenticated user's ID).

---

### Issue 5.3 — No Environment Variable Validation at Startup

**What is wrong?**  
If `JWT_SECRET` or `DB_*` variables are absent, the app starts with insecure defaults and no warning.

**Recommended solution:**  
Validate all required env vars at startup and call `process.exit(1)` if any are missing.

---

### Issue 5.4 — `updatedAt` Field Is Never Updated in Service Methods

**What is wrong?**  
`users.ts` line 14: `updatedAt: timestamp("updated_at").defaultNow().notNull()`. The `defaultNow()` only runs on `INSERT`. No `UPDATE` path sets `updatedAt`. The column always reflects the creation time.

**Where does it exist?**  
`src/service/userService.ts` `updateUser` method (line 50).

**Recommended solution:**  
```typescript
await db.update(users)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(users.id, id))
  .returning();
```

---

### Issue 5.5 — No `.env.example` File

**What is wrong?**  
`.gitignore` excludes `.env`, but there is no `.env.example` documenting required variables. A new developer has no reference for what environment variables to set.

**Recommended solution:**  
Create `.env.example`:
```env
PORT=4000
JWT_SECRET=change_me_to_a_strong_random_string
DB_HOST=localhost
DB_PORT=5432
DB_USER=eduvision
DB_PASSWORD=change_me
DB_NAME=eduvision
ALLOWED_ORIGINS=http://localhost:3000
```

---

### Issue 5.6 — `docker-compose.yml` App Service Has No `environment` Block

**What is wrong?**  
The `eduvision` service in `docker-compose.yml` has no `environment` or `env_file` entry. The app container receives no environment variables, so it falls back to the hardcoded defaults.

**Recommended solution:**  
```yaml
eduvision:
  env_file:
    - .env
  # ...
```

---

### Issue 5.7 — Dockerfile Is Not Production-Ready

**What is wrong?**  
- Uses `node:22` (full image, ~1 GB) instead of `node:22-alpine`.
- Runs `tsc-watch` (a development tool) in the container command.
- Installs all dependencies including devDependencies.
- No multi-stage build.

**Recommended solution:**  
Multi-stage Dockerfile:
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

---

## 6. Performance Review

---

### Issue 6.1 — Deep Eager Loads in Course Queries (Confirmed)

Already covered in §4.1. The key performance point: Drizzle's relational `findMany` with nested `with:` clauses issues **multiple SQL queries** (not a single JOIN). For `getAllCourses` with 4 nesting levels, this means 4+ database round-trips per request. Under concurrent load this multiplies rapidly.

**Recommended solution:**  
Shallow listings by default; drill-down via dedicated endpoints.

---

### Issue 6.2 — `getAllUsers` Selects Password Column for Every Row

**What is wrong?**  
`userService.ts` line 32: `db.select().from(users)` — selects all columns including `password` for every row in the result set.

**Why is it a problem?**  
Unnecessary data transferred from PostgreSQL to Node.js and then serialized in the JSON response. A security concern (see §3.3) as well as a minor performance concern.

**Recommended solution:**
```typescript
db.select({
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
}).from(users);
```

---

### Issue 6.3 — No Database Indexes on Filtered Columns (Confirmed Performance Issue)

Already covered in §4.3. Without indexes on FK columns, `WHERE` clause lookups become full table scans at scale.

---

## 7. Reliability & Error Handling Review

---

### Strength — Centralized Error Handler Is Well Implemented

`errorHandler.ts` correctly:
- Distinguishes `AppError` (operational) from unexpected errors.
- Maps known PostgreSQL error codes (23505, 23503, 23502, 22P02) to appropriate HTTP status/messages.
- Logs unexpected errors with `console.error`.
- Never leaks stack traces to clients.

This is the strongest part of the codebase. The pattern is clean and safe.

---

### Issue 7.1 — `console.error` Is the Sole Logging Mechanism

**What is wrong?**  
`errorHandler.ts` line 70: `console.error(...)` is the only logging in the application. There is no request logging, no log levels, no structured (JSON) output, no correlation IDs.

**Why is it a problem?**  
In production, logs are unstructured, difficult to search and aggregate. There is no way to trace a specific request through the system.

**Recommended solution:**  
Integrate `pino` (minimal overhead, JSON output):
```typescript
import pino from "pino";
export const logger = pino({ level: process.env.LOG_LEVEL || "info" });
```
Add `pino-http` for automatic request logging.

---

### Issue 7.2 — No Database Connection Health Check at Startup

**What is wrong?**  
`server.ts` starts listening before testing the database connection. If PostgreSQL is unavailable, the server appears healthy but every request fails with a DB error.

**Recommended solution:**
```typescript
import { pool } from "./config/config.js";

async function start() {
  try {
    await pool.connect(); // verify connectivity
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  }
}
start();
```

---

### Issue 7.3 — No Graceful Shutdown

**What is wrong?**  
`server.ts` has no `SIGTERM`/`SIGINT` handlers. A container shutdown immediately terminates the process, dropping in-flight requests and leaving DB connections open.

**Recommended solution:**
```typescript
const server = app.listen(PORT, ...);

process.on("SIGTERM", () => {
  server.close(() => {
    pool.end(() => process.exit(0));
  });
});
```

---

### Issue 7.4 — Silent Failures on Missing Body Parameters in Sub-Resource Operations

**What is wrong?**  
`deleteLesson` in `lessonsController.ts` line 52: `lessonsService.deleteLesson(id, req.body.course_id)`. If `course_id` is missing from the body, the service's `WHERE` condition never matches. The service returns `undefined`. The controller throws `AppError("Lesson not found", 404)` — but the lesson exists. The caller receives a completely misleading error.

The same silent failure pattern exists in:
- `quizzesController.ts` line 51
- `questionsController.ts` line 48
- `optionsController.ts` line 59

**Why is it a problem?**  
Misleading errors make debugging extremely difficult. Data is not corrupted, but operations silently no-op.

**Recommended solution:**  
Validate that all required body parameters are present before calling the service (via Zod, see §3.5). Return `400 Bad Request` if a required field is missing.

---

### Issue 7.5 — No Retry or Timeout Strategy for Database Operations

**What is wrong?**  
All database calls are fire-and-forget with no timeout or retry on transient failures (e.g., connection reset, temporary unavailability).

**Why is it a problem?**  
A transient DB hiccup causes a 500 error to the client with no recovery attempt.

**Recommended solution:**  
At the pool level, configure `connectionTimeoutMillis` and `idleTimeoutMillis` in `pg.Pool`. For critical writes, consider a simple retry with exponential back-off for transient errors.

---

## 8. Database Review

---

### 8.1 — Schema Design Is Correct and Normalized

The entity-relationship model is appropriate:

```
users (1) ──< courses (1) ──< lessons (1) ──0..1── quizzes (1) ──< questions (1) ──< options
```

All relations are declared with proper `references()` (foreign keys enforced at DB level). The `quizzes.lesson_id` has a `UNIQUE` constraint ensuring one quiz per lesson — this is correct business logic encoded in the schema.

---

### Issue 8.2 — No Cascade Delete Rules on Any Foreign Key

**What is wrong?**  
No `onDelete` behavior is defined on any foreign key:
- `lessons.course_id → courses.id`: Deleting a course will fail with PG error 23503 (FK violation) if any lessons exist, rather than cascading.
- Same for quizzes → lessons, questions → quizzes, options → questions.

**Why is it a problem?**  
The error handler maps 23503 to `"Related record does not exist"` with status 409. This message is incorrect for this scenario — the problem is that dependent records exist and haven't been deleted.

**Where does it exist?**  
All `src/db/schema/*.ts` foreign key references.

**Recommended solution:**  
Either:
1. Add `{ onDelete: "cascade" }` to all child FK references so deleting a parent automatically removes all children.
2. Or implement a manual multi-step delete in the service layer inside a transaction.

Option 1 is simpler and appropriate for this data model.

---

### Issue 8.3 — Missing Indexes on Foreign Key Columns

Already covered in §4.3 and §6.3. This is the most impactful database performance issue.

---

### Issue 8.4 — `question_text` and `option_text` Use `varchar(500)` — May Be Too Restrictive

**What is wrong?**  
`questions.ts` line 11: `varchar("question_text", { length: 500 })`. Long educational questions with context can easily exceed 500 characters.

**Recommended solution:**  
Use `text` type (no length limit) for both `question_text` and `option_text`. PostgreSQL's `text` and unbounded `varchar` have identical storage and performance characteristics.

---

### Issue 8.5 — `courses` Table Is Missing `updatedAt`

**What is wrong?**  
`db/schema/courses.ts` has `createdAt` (line 25) but no `updatedAt` column, unlike `users`.

**Why is it a problem?**  
No audit trail for when course title or price was last changed.

**Recommended solution:**  
Add `updatedAt: timestamp("updated_at").defaultNow().notNull()` and update it in `courseService.updateCourse`.

---

### Issue 8.6 — Using `drizzle-kit push --force` in Production-Like Environments

**What is wrong?**  
`package.json` script: `"db:push": "drizzle-kit push --force"`. This is also run in `docker-compose.yml` as the startup command.

**Why is it a problem?**  
`push --force` skips all safety confirmations. It can drop and recreate columns, destroying data. This is appropriate only for local development against a clean database.

**Recommended solution:**  
Use `drizzle-kit generate` to produce migration SQL files, then `drizzle-kit migrate` to apply them. Track migration files in git. Never use `--force` against any database with real data.

---

### Issue 8.7 — No Unique Constraint Enforcing One Correct Option Per Question

Already covered in §4.5. This is both a data integrity issue and a business logic reliability issue.

---

## 9. Testing Review

---

### Issue 9.1 — Zero Test Coverage

**What is wrong?**  
There are no test files anywhere in the project. No `__tests__` directories, no `.test.ts` or `.spec.ts` files, no testing framework installed (`jest`, `vitest`, `mocha`, `supertest` are absent from `package.json`).

**Why is it a problem?**  
There is no automated safety net. Every refactoring or feature addition is done blind. Critical paths cannot be verified without manual API testing.

**Critical paths with zero coverage:**
- User registration — valid, duplicate email
- User login — correct credentials, wrong password
- JWT verification — expired token, malformed token, missing token
- Role-based access — student accessing admin-only routes
- Ownership enforcement — admin modifying another admin's course
- `checkAnswer` — correct answer, incorrect answer, non-existent option
- Cascade delete behavior — deleting a course with lessons
- All 404 scenarios (course/lesson/quiz/question/option not found)
- Privilege escalation attempt via `updateUser`

---

### Issue 9.2 — Recommended Testing Strategy

For a REST API backed by PostgreSQL, the most practical and valuable tests are **integration tests** at the HTTP level:

**Setup:**  
- Framework: `vitest` (fast, modern, TypeScript-native) + `supertest`
- Database: Use a dedicated test PostgreSQL database (e.g., via a `docker-compose.test.yml` or `testcontainers`)
- Reset state between tests with `drizzle-kit push` against the test DB

**Minimum viable test suite (establish first):**

| Test | Type | Priority |
|---|---|---|
| `POST /api/auth/register` — success | Integration | High |
| `POST /api/auth/register` — duplicate email → 409 | Integration | High |
| `POST /api/auth/login` — correct credentials | Integration | High |
| `POST /api/auth/login` — wrong password → 401 | Integration | High |
| `GET /api/courses` — no token → 401 | Integration | High |
| `POST /api/courses` — admin → 201 | Integration | High |
| `POST /api/courses` — student → 403 | Integration | High |
| `PATCH /api/auth/:id` — student escalates role → 400 | Integration | Critical |
| `DELETE /api/auth/:otherId` — student IDOR → 403 | Integration | Critical |
| `POST /api/options/check-answer` — correct answer | Integration | High |
| `POST /api/options/check-answer` — wrong answer | Integration | High |

---

## 10. Overall Engineering Assessment

### Architecture Summary

EduVision's backend is a **Layered Monolith** with a consistent Router → Controller → Service → Drizzle ORM → PostgreSQL pattern. For an API of this complexity and at the current team size, the architecture is appropriate. The code is readable, the separation of concerns is clear, and the project has made good foundational decisions: TypeScript, Drizzle ORM, centralized error handling, JWT authentication, and Docker.

However, the project has not yet addressed the security and reliability requirements needed for a production deployment. The critical issues (plain-text passwords, hardcoded credentials, password in responses, privilege escalation) must be resolved before any real users or data are involved.

---

### Strengths

1. **Consistent layered architecture** — Router/Controller/Service/Schema separation is well understood and applied uniformly across all 5 resource domains.
2. **Excellent centralized error handling** — `AppError` + `errorHandler` with PostgreSQL error code mapping is thoughtfully designed. Stack traces never reach clients.
3. **`asyncHandler` wrapper** — correctly prevents unhandled promise rejections from crashing the server.
4. **Role-based authorization** — `authenticate` + `authorize` middleware pattern is clean and consistently applied to routes.
5. **Course-level ownership enforcement** — `updateCourse` and `deleteCourse` filter by both `id` AND `admin_id`, which is the correct pattern.
6. **Drizzle relations properly declared** — schema relations enable type-safe relational queries.
7. **Reproducible development environment** — Docker + Compose makes local setup straightforward.
8. **TypeScript end-to-end** — Drizzle infers types from schema definitions, providing type safety in service methods.

---

### Critical Issues

| # | Issue | File(s) |
|---|---|---|
| C1 | Plain-text password storage and comparison | `userService.ts:16,24` |
| C2 | Hardcoded DB password and JWT secret in source code | `config.ts:7`, `auth.ts:5`, `drizzle.config.ts:11` |
| C3 | Password field returned in all auth API responses | `authController.ts:12,36,45` |
| C4 | Privilege escalation via mass assignment on `updateUser` | `authController.ts:41`, `userService.ts:52` |

---

### High Priority

| # | Issue | File(s) |
|---|---|---|
| H1 | No input validation on any endpoint | All controllers |
| H2 | IDOR — students can delete any user | `authRouter.ts:16`, `authController.ts:30-37` |
| H3 | `getBearerToken` dead-code logic bug | `auth.ts:16-20` |
| H4 | No rate limiting on authentication endpoints | `authRouter.ts` |
| H5 | Multiple `drizzle()` instances per service file | All service files |
| H6 | No indexes on FK columns | `db/schema/*.ts` |
| H7 | `getAllCourses` unbounded deep eager load | `courseService.ts:14-33` |
| H8 | No cascade delete rules | All schema FK definitions |

---

### Medium Priority

| # | Issue | File(s) |
|---|---|---|
| M1 | Cross-admin sub-resource modification | `lessonsService.ts`, `quizzesService.ts`, `questionsService.ts`, `optionsService.ts` |
| M2 | No request body size limit | `server.ts:13` |
| M3 | No CORS configuration | `server.ts` |
| M4 | No security headers (Helmet) | `server.ts` |
| M5 | JWT secret duplicated in two files | `auth.ts:5`, `token.ts:3` |
| M6 | `updatedAt` not auto-updated in service methods | All `update*` service methods |
| M7 | `courses` table missing `updatedAt` column | `db/schema/courses.ts` |
| M8 | `docker-compose.yml` app service missing environment vars | `docker-compose.yml` |
| M9 | `db:push --force` unsafe for production | `package.json`, `docker-compose.yml` |
| M10 | No graceful shutdown | `server.ts` |
| M11 | No DB connection health check at startup | `server.ts` |
| M12 | Silent failures on missing body params for sub-resources | `lessonsController.ts:40,52` etc. |
| M13 | Structured logging absent | `errorHandler.ts:70` |

---

### Nice to Have

| # | Issue |
|---|---|
| N1 | Shorter JWT access token + refresh token flow |
| N2 | `.env.example` file |
| N3 | Multi-stage production Dockerfile |
| N4 | Rename `AuthService` → `UserService` |
| N5 | Use `text` type for `question_text` and `option_text` |
| N6 | Partial unique index on one correct option per question |
| N7 | Structured logging with `pino` |
| N8 | Pagination on all list endpoints |
| N9 | `updatedAt` column on `courses` table |
| N10 | PORT configurable via env var |

---

## 11. Recommended Roadmap

### Phase 1 — Critical Fixes *(Resolve before any real users or data)*

| Priority | Problem | Recommended Solution | Files Affected | Benefit | Complexity |
|---|---|---|---|---|---|
| 🔴 Critical | Passwords stored as plain text | Install `bcrypt`; hash on register, compare on login | `userService.ts` | Safe credentials even on DB breach | Low |
| 🔴 Critical | Hardcoded credentials in source | Remove fallbacks; require env vars; add `.env.example`; rotate credentials | `config.ts`, `auth.ts`, `token.ts`, `drizzle.config.ts` | No credentials in source control | Low |
| 🔴 Critical | Password returned in API responses | Destructure `password` out before `res.json()`; add `sanitizeUser()` helper | `authController.ts`, `userService.ts` | Credentials never leave the server | Low |
| 🔴 Critical | Privilege escalation via `updateUser` | Whitelist allowed update fields; remove `role` from accepted body | `authController.ts`, `userService.ts` | Eliminates role self-promotion | Low |

---

### Phase 2 — Architecture & Security

| Priority | Problem | Recommended Solution | Files Affected | Benefit | Complexity |
|---|---|---|---|---|---|
| 🟡 High | No input validation | Add `zod`; validate all request bodies; return 400 on schema failure | All controllers + new `src/validators/` | Type safety; prevents bad data reaching DB | Medium |
| 🟡 High | IDOR on user delete | Add ownership check in `deleteUser` | `authController.ts`, `authRouter.ts` | Prevents unauthorized deletion | Low |
| 🟡 High | No rate limiting | Add `express-rate-limit` on login/register | `authRouter.ts` | Prevents brute-force attacks | Low |
| 🟡 High | `getBearerToken` bug | Return `undefined` if not a Bearer token | `auth.ts` | Correct token extraction | Low |
| 🟠 Medium | Multiple `drizzle()` instances | Create `src/db/db.ts` singleton | All service files | Single DB client; consistent query API | Low |
| 🟠 Medium | No CORS | Add `cors` with allowlist | `server.ts` | Controlled cross-origin access | Low |
| 🟠 Medium | No security headers | Add `helmet` | `server.ts` | Improved HTTP security posture | Low |
| 🟠 Medium | No request body size limit | `express.json({ limit: "10kb" })` | `server.ts` | Prevents large payload DoS | Low |
| 🟠 Medium | Docker missing env vars | Add `env_file` to app service | `docker-compose.yml` | App gets credentials at runtime | Low |
| 🟠 Medium | No startup health check | Test DB connection before `app.listen()` | `server.ts` | Fail fast on misconfiguration | Low |
| 🟠 Medium | No graceful shutdown | Handle `SIGTERM`/`SIGINT` | `server.ts` | Clean connection teardown | Low |
| 🟠 Medium | JWT secret duplicated | Export from `config.ts`; import in both files | `auth.ts`, `token.ts` | Single source of truth | Low |

---

### Phase 3 — Performance & Scalability

| Priority | Problem | Recommended Solution | Files Affected | Benefit | Complexity |
|---|---|---|---|---|---|
| 🟡 High | Deep unbounded eager load on `getAllCourses` | Shallow list by default; pagination | `courseService.ts` | Prevents memory/performance degradation | Medium |
| 🟡 High | All list endpoints unbounded | Add `limit`/`offset` pagination | All service `getAll*` methods | Predictable response sizes | Medium |
| 🟡 High | Missing FK indexes | Add `index()` to all FK columns in schema | `db/schema/*.ts` | Faster filtered queries | Low |
| 🟡 High | No cascade delete | Add `{ onDelete: "cascade" }` on FK refs | All `db/schema/*.ts` | Correct delete behavior; no orphaned data | Low |
| 🟠 Medium | No migration strategy | Replace `push --force` with `generate`/`migrate` | `package.json`, `docker-compose.yml` | Safe schema evolution in production | Medium |
| 🔵 Low | `getAllUsers` selects password column | Column-select in query | `userService.ts` | Smaller payload; security hygiene | Low |
| 🔵 Low | One correct option constraint | Add partial unique index in schema | `options.ts` | Data integrity for answer checking | Low |

---

### Phase 4 — Maintainability

| Priority | Problem | Recommended Solution | Files Affected | Benefit | Complexity |
|---|---|---|---|---|---|
| 🟠 Medium | Zero test coverage | Set up `vitest` + `supertest`; write integration tests for auth, RBAC, ownership | New `src/__tests__/` | Safety net for all future changes | High |
| 🟠 Medium | `updatedAt` not auto-updated | Add `updatedAt: new Date()` to all update methods | All service `update*` methods | Correct audit timestamps | Low |
| 🟠 Medium | `courses` missing `updatedAt` | Add column + update logic | `courses.ts`, `courseService.ts` | Audit completeness | Low |
| 🔵 Low | No structured logging | Add `pino` + `pino-http` | `errorHandler.ts` + new middleware | Production-grade log aggregation | Low |
| 🔵 Low | `AuthService` naming | Rename to `UserService` | `userService.ts`, `authController.ts` | Clearer naming | Low |
| 🔵 Low | `question_text`/`option_text` varchar limit | Change to `text` type | `questions.ts`, `options.ts` | No artificial character limit | Low |
| 🔵 Low | Multi-stage Dockerfile | Builder + Alpine production stage | `Dockerfile` | Smaller, safer production image | Medium |
| 🔵 Low | JWT refresh token flow | Shorter access token + refresh endpoint | `token.ts` + new router/service | Better session security | High |

---

## 12. Final Scorecard

| Category | Status | Main Findings |
|---|---|---|
| **System Design** | Needs Improvement | Correct layered design for project size; blocked by missing validation, hardcoded secrets, no pagination, hardcoded port |
| **Architecture** | Needs Improvement | Consistent Router/Controller/Service pattern; multiple `drizzle()` instances per service; misleading `AuthService` name; port hardcoded |
| **Security** | **High Risk** | Plain-text passwords (C1); hardcoded credentials in source (C2); password leaked in API responses (C3); privilege escalation via mass assignment (C4); IDOR on user delete; no rate limiting; no input validation |
| **Scalability** | Needs Improvement | Unbounded deep eager loads; no pagination; no FK indexes; cascade deletes absent; `push --force` unsafe for production |
| **Maintainability** | Needs Improvement | No input DTOs; no tests; no `.env.example`; silent failures on missing body params; `updatedAt` never updated; no structured logging |
| **Performance** | Needs Improvement | `getAllCourses` loads entire object graph with no limit; all list endpoints are unbounded; FK columns lack indexes |
| **Reliability** | Needs Improvement | No graceful shutdown; no startup DB health check; silent failures on missing body params; `console.error` only; no transient error handling |
| **Database** | Needs Improvement | No FK indexes; no cascade deletes; no migration files (`push --force` used); `updatedAt` missing from `courses`; no unique constraint for one correct option per question |
| **Testing** | **High Risk** | Zero test coverage; no testing framework installed; no tests for auth flow, RBAC, ownership enforcement, or any business logic |

---

*This document is a living engineering reference. Issues should be addressed in phase order. All Critical items must be resolved before any production deployment or onboarding of real users.*
