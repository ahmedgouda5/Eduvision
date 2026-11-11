# EduVision 🎥🔒

**EduVision** is a video-course platform focused on smart security systems training (IP cameras, video doorbells, alarm systems, NVR/DVR, etc.). The current backend lets students register and log in, browse courses/lessons/quizzes, enroll in a course, submit a manual **Vodafone Cash** or **InstaPay** payment for admin approval, and take quizzes.

> This README documents the implemented Node.js/TypeScript API and its PostgreSQL/Redis infrastructure. Certificate issuing, lesson locking, progress tracking, enrollment-gated content access, and video delivery are not implemented yet.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Request pipeline](#request-pipeline)
- [Database schema (ERD)](#database-schema-erd)
- [Enrollment and payment flow](#enrollment-and-payment-flow)
- [Getting started (Docker)](#getting-started-docker)
- [Environment variables](#environment-variables)
- [NPM scripts](#npm-scripts)
- [API surface](#api-surface)
- [Current limitations](#current-limitations)
- [Roadmap](#roadmap)

---

## Tech stack

| Layer            | Technology                                              |
|------------------|---------------------------------------------------------|
| Runtime          | Node.js (ESM, `type: module`)                            |
| Language         | TypeScript 5                                             |
| Web framework    | Express 5                                                |
| ORM              | Drizzle ORM + Drizzle Kit                                |
| Database         | PostgreSQL 17 (Alpine)                                   |
| Cache            | Redis 7 (course catalog)                                 |
| Auth             | JWT (`jsonwebtoken`) in an HttpOnly cookie + `bcrypt`    |
| Security         | `helmet`, `cors`, `express-rate-limit` (40 req/min/IP)   |
| Dev tooling      | `tsc-watch` (hot reload for `dev`)                       |
| Containerization | Docker + Docker Compose                                  |

---

## Project structure

```
eduvision/
├── src/
│   ├── server.ts                       # Express app bootstrap and router mounting
│   ├── config/
│   │   ├── config.ts                   # shared pg Pool
│   │   ├── env.ts                      # JWT_SECRET loading/validation
│   │   ├── RateLimiterconfig.ts        # global API rate limiter
│   │   └── redis.ts                    # Redis client
│   ├── db/
│   │   ├── schema/
│   │   │   ├── users.ts
│   │   │   ├── courses.ts
│   │   │   ├── lessons.ts
│   │   │   ├── quizzes.ts
│   │   │   ├── questions.ts
│   │   │   ├── options.ts
│   │   │   ├── quiz_attempts.ts
│   │   │   ├── Enrollments.ts
│   │   │   ├── payment.ts
│   │   │   └── index.ts                # re-exports all schemas
│   │   └── seed.ts                     # demo data seeding
│   ├── errors/
│   │   └── AppError.ts
│   ├── middlewares/
│   │   ├── auth.ts                     # authenticate + authorize("admin" | "student")
│   │   ├── asyncHandler.ts
│   │   └── errorHandler.ts             # centralized errors + PG code mapping
│   ├── modules/
│   │   ├── auth/                       # AuthService
│   │   ├── course/                     # CourseService (+ Cash/cache.service.ts)
│   │   ├── lesson/                     # LessonsService
│   │   ├── quiz/                       # QuizzesService
│   │   ├── question/                   # QuestionsService
│   │   ├── option/                     # OptionsService
│   │   ├── quiz_attempts/              # QuizAttemptsService
│   │   ├── enrollments/                # EnrollmentService
│   │   └── payments/                   # PaymentService
│   │       └── (each module: service + controller + router)
│   └── utils/
│       ├── hashedPassword.ts
│       └── token.ts                    # JWT sign/verify
├── drizzle/                            # generated migration + metadata
├── dist/                               # compiled JS output
├── artifacts/                          # generated architecture field guide
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

Every domain uses the same shape: a router declares authentication/role guards, a thin controller parses the request, and a service class owns the business logic and Drizzle queries. Responses use `{ success: true, data }` or `{ success: true, msg }`; errors return `{ success: false, message }`.

---

## Request pipeline

1. `express-rate-limit` applies a global limit of 40 requests per minute per IP.
2. `helmet`, CORS (`origin: "*"`, credentials enabled), JSON parsing, and `cookie-parser` run.
3. One of nine routers handles the request: auth, courses, lessons, quizzes, questions, options, quiz-attempts, enrollments, payments.
4. `authenticate` reads the `token` cookie and attaches `{ id, role }` to the request; `authorize` restricts routes to `admin` or `student`.
5. The controller calls the matching service class.
6. Services query PostgreSQL through Drizzle over a shared `pg` Pool. `CourseService` uses Redis for the course catalog with a 10-minute TTL.
7. Unknown routes produce a 404 `AppError`; `errorHandler` maps PostgreSQL error codes (`23505`, `23503`, etc.) and returns a consistent JSON error.

---

## Database schema (ERD)

Nine tables, four enums, ten foreign keys:

| Table           | Key columns                                                                 | Relationships                                      |
|-----------------|-----------------------------------------------------------------------------|----------------------------------------------------|
| `users`         | `id` UUID PK, `name`, `email` unique, `password` hash, `role` enum, timestamps | one-to-many courses, enrollments, quiz attempts     |
| `courses`       | `id` UUID PK, `title`, `price` integer, `admin_id` FK, timestamps           | `admin_id` → users.id; many lessons, enrollments    |
| `lessons`       | `id` UUID PK, `course_id` FK, `title`, `duration_sec`                        | `course_id` → courses.id; one quiz                  |
| `quizzes`       | `id` UUID PK, `lesson_id` FK unique, `title`                                 | `lesson_id` → lessons.id; many questions            |
| `questions`     | `id` UUID PK, `quiz_id` FK, `question_text`                                  | `quiz_id` → quizzes.id; many options                |
| `options`       | `id` UUID PK, `question_id` FK, `option_text`, `is_correct`                  | `question_id` → questions.id                        |
| `quiz_attempts` | `id` UUID PK, `user_id` FK, `quiz_id` FK, `score`, `attempted_at`            | unique `(user_id, quiz_id)`; cascade on delete      |
| `enrollments`   | `id` UUID PK, `user_id` FK, `course_id` FK, `status` enum, `created_at`      | unique `(user_id, course_id)`; many payments         |
| `payments`      | `id` UUID PK, `enrollment_id` FK, `amount`, `method`, sender fields, `status`, `created_at` | `enrollment_id` → enrollments.id; unique `transaction_number` |

Enums:

- `role`: `admin`, `student`
- `enrollment_status`: `PENDING`, `APPROVED`, `SUSPENDED`
- `payment_status`: `PENDING`, `APPROVED`, `REJECTED`
- `payment_method`: `VCASH`, `INSTAPAY`

Indexes and constraints: `enrollments_course_id_idx`, `payments_enrollment_id_idx`, `payments_status_idx`, unique `enrollments_user_course_unique`, unique `payments_transaction_number_unique`, unique `unique_user_quiz`.

**Relationships in words:**

- An admin (a `users` row with `role = admin`) owns many courses through `courses.admin_id`.
- A course has many lessons; a lesson has at most one quiz; a quiz has many questions; each question has many options.
- A student enrolls in courses through `enrollments`; an enrollment can have multiple payment submissions.
- A payment belongs to an enrollment, not directly to a user or course. Its amount is copied from the course price by `PaymentService`.
- Quiz attempts are one per student per quiz and store the number of correct answers.

There is no `certificates` table in the current schema.

---

## Enrollment and payment flow

1. **Create enrollment** — `POST /api/enrollments` with `{ courseId }`. The student ID comes from the JWT. Missing course → 404; duplicate `(user, course)` → 409. New rows default to `PENDING`.
2. **Submit payment** — `POST /api/payments` with `{ enrollmentId, method, senderName, senderPhone, transactionNumber }`. The service verifies the enrollment exists (404), belongs to the caller (403), validates the method and field lengths (400), rejects a reused transaction number (409), and stores `amount = enrollment.course.price`. Status defaults to `PENDING`.
3. **Review payments** — `GET /api/payments` returns every submission for admins.
4. **Approve payment** — `PATCH /api/payments/:id/approve` runs one transaction: the payment becomes `APPROVED` and its enrollment becomes `APPROVED`. A missing payment → 404; a non-pending payment → 409.

Not implemented: reject route, admin note, receipt upload, provider SDK/webhook, duplicate-payment policy per enrollment, and student-facing `/me` listings.

---

## Getting started (Docker)

```bash
docker compose up --build
```

This will:

1. Start `db-eduvision` — PostgreSQL 17 on host port **5433** (container 5432), with a healthcheck.
2. Start `redis-eduvision` — Redis 7 on host port **6379**.
3. Build and start `eduvision` on host port **4000**, running:

   ```sh
   npm run db:push && npm run db:seed && npm run dev
   ```

4. Mount `./src` and `./dist` and rebuild on changes via `tsc-watch`.

`db:push` uses `drizzle-kit push --force` against the schema. A generated migration also exists at `drizzle/0000_payments_transaction_number_unique.sql`; the container still applies schema with push on every boot.

### Running outside Docker

```powershell
$env:DB_HOST="localhost"; $env:DB_PORT="5433"
$env:REDIS_URL="redis://localhost:6379"
npm install
npm run build
npm run db:push
npm run db:seed
npm run dev
```

`db:seed` runs `node dist/db/seed.js`, so build first. The seed reuses the demo users, course, enrollment, and `SEED-TXN-0001` payment across runs, but it appends a new demo lesson, quiz, 10 questions, and 40 options on every run. The seeded users have placeholder password hashes and cannot log in.

---

## Environment variables

Docker Compose reads `.env` through `env_file`. The application requires:

```env
JWT_SECRET=replace-with-at-least-32-characters
DB_HOST=db-eduvision
DB_PORT=5432
DB_USER=eduvision
DB_PASSWORD=replace-me
DB_NAME=eduvision
REDIS_URL=redis://redis-eduvision:6379
```

Notes:

- `JWT_SECRET` is required at import time and must be at least 32 characters.
- Database values fall back to the compose defaults when unset.
- The server currently listens on port `4000` in code; `PORT` is not read.
- When running on the host, use `DB_HOST=localhost`, `DB_PORT=5433`, and `REDIS_URL=redis://localhost:6379`.

---

## NPM scripts

| Script               | Description                                                        |
|----------------------|--------------------------------------------------------------------|
| `dev`                | Watches TS with `tsc-watch`, restarts `dist/server.js` on success  |
| `build`              | Compiles TypeScript to `dist/`                                     |
| `start`              | Runs the compiled server (`node dist/server.js`)                   |
| `db:push`            | Pushes the Drizzle schema (`drizzle-kit push --force`)             |
| `db:seed`            | Runs the compiled seed script (`node dist/db/seed.js`)             |
| `docker:build`       | `docker-compose up --build -d`                                     |
| `docker:dev`         | `docker-compose up -d`                                             |
| `docker:down`        | `docker-compose down`                                              |
| `docker:showdb`      | Opens `psql` in the `db-eduvision` container                       |

There are no test or lint scripts yet.

---

## API surface

44 mounted routes. All non-auth routes require the `token` cookie; the access column shows the additional role guard.

| Domain        | Method | Route                             | Access  |
|---------------|--------|-----------------------------------|---------|
| Auth          | POST   | `/api/auth/register`              | Public  |
| Auth          | POST   | `/api/auth/login`                 | Public  |
| Auth          | POST   | `/api/auth/logout`                | Any     |
| Auth          | GET    | `/api/auth`                       | Admin   |
| Auth          | PATCH  | `/api/auth/:id`                   | Student |
| Auth          | DELETE | `/api/auth/:id`                   | Admin   |
| Courses       | POST   | `/api/courses`                    | Admin   |
| Courses       | GET    | `/api/courses`                    | Any     |
| Courses       | GET    | `/api/courses/:id`                | Any     |
| Courses       | PATCH  | `/api/courses/:id`                | Admin   |
| Courses       | DELETE | `/api/courses/:id`                | Admin   |
| Lessons       | POST   | `/api/lessons`                    | Admin   |
| Lessons       | GET    | `/api/lessons`                    | Any     |
| Lessons       | GET    | `/api/lessons/course/:course_id`  | Any     |
| Lessons       | GET    | `/api/lessons/:id`                | Any     |
| Lessons       | PATCH  | `/api/lessons/:id`                | Admin   |
| Lessons       | DELETE | `/api/lessons/:id`                | Admin   |
| Quizzes       | POST   | `/api/quizzes`                    | Admin   |
| Quizzes       | GET    | `/api/quizzes`                    | Any     |
| Quizzes       | GET    | `/api/quizzes/lesson/:lesson_id`  | Any     |
| Quizzes       | GET    | `/api/quizzes/:id`                | Any     |
| Quizzes       | PATCH  | `/api/quizzes/:id`                | Admin   |
| Quizzes       | DELETE | `/api/quizzes/:id`                | Admin   |
| Questions     | POST   | `/api/questions`                  | Admin   |
| Questions     | GET    | `/api/questions`                  | Any     |
| Questions     | GET    | `/api/questions/quiz/:quiz_id`    | Any     |
| Questions     | GET    | `/api/questions/:id`              | Any     |
| Questions     | PATCH  | `/api/questions/:id`              | Admin   |
| Questions     | DELETE | `/api/questions/:id`              | Admin   |
| Options       | POST   | `/api/options`                    | Admin   |
| Options       | GET    | `/api/options`                    | Any     |
| Options       | POST   | `/api/options/check-answer`       | Any     |
| Options       | GET    | `/api/options/question/:question_id` | Any  |
| Options       | GET    | `/api/options/:id`                | Any     |
| Options       | PATCH  | `/api/options/:id`                | Admin   |
| Options       | DELETE | `/api/options/:id`                | Admin   |
| Quiz attempts | POST   | `/api/quiz-attempts`              | Student |
| Quiz attempts | GET    | `/api/quiz-attempts/me`           | Student |
| Quiz attempts | GET    | `/api/quiz-attempts/quiz/:quiz_id` | Admin  |
| Enrollments   | POST   | `/api/enrollments`                | Student |
| Enrollments   | GET    | `/api/enrollments`                | Admin   |
| Payments      | POST   | `/api/payments`                   | Student |
| Payments      | GET    | `/api/payments`                   | Admin   |
| Payments      | PATCH  | `/api/payments/:id/approve`       | Admin   |

A visual route-by-route map is available in `artifacts/eduvision-architecture.html`.

---

## Current limitations

- Content reads (courses, lessons, quizzes, questions, options) require login but **do not check enrollment**, so any signed-in user can discover any content.
- Lesson locking and progress tracking are not implemented; `enrollments` has no progress column.
- Certificates are not implemented.
- Payments support approval only: there is no reject endpoint, admin note, receipt upload, or provider integration. `REJECTED` exists in the enum but no code writes it.
- Students cannot list their own enrollments or payments.
- `PATCH /api/auth/:id` is guarded by `authorize("student")` and does not check that `:id` matches the caller.
- The course catalog cache has a 10-minute TTL and mutations do not invalidate it.
- Input validation is manual; `zod` is not used.
- No tests, structured logging, health endpoint, CI, or graceful shutdown.
- Deployments use `db:push --force`; the generated `drizzle/` migration is not the primary apply path.
- The seed appends lesson/quiz/question/option data on every run.

---

## Roadmap

- [x] Drizzle schema for users, courses, lessons, quizzes, questions, options, quiz attempts, enrollments, payments.
- [x] JWT cookie authentication, password hashing, and admin/student role guards.
- [x] CRUD routes for course content domains.
- [x] Server-side quiz grading and attempt history.
- [x] Enrollment creation with course/duplicate checks and admin listing.
- [x] Manual payment submission with ownership checks, server-derived price, and unique transaction numbers.
- [x] Admin payment approval that approves the enrollment in one transaction.
- [x] Centralized error handling, rate limiting, Redis course cache, Docker setup, and seed script.
- [ ] Reject payment / admin note / receipt upload.
- [ ] Student `/me` listings for enrollments and payments.
- [ ] Enrollment-gated content access, lesson locking, and progress tracking.
- [ ] Certificate issuing when a course is completed.
- [ ] Request validation (`zod`) and automated tests.
- [ ] Structured logging, health endpoint, and graceful shutdown.
- [ ] Migration-first deployment instead of `db:push --force`.
- [ ] Idempotent seed for lesson/quiz demo data.
