# EduVision 🎥🔒

**EduVision** is a video-course platform focused on smart security systems training (IP cameras, video doorbells, alarm systems, NVR/DVR, etc.). Students browse courses, pay per-course via **Vodafone Cash** (receipt upload + admin approval), watch lessons, pass a quiz after each lesson to unlock the next one, and receive a certificate on completion.

> This README documents the current codebase (Node.js/TypeScript API + PostgreSQL, containerized with Docker) and the target backend architecture, based on the project's `package.json`, `docker-compose.yml`, and the ERD below.

---

## Table of contents

- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Database schema (ERD)](#database-schema-erd)
- [Backend architecture](#backend-architecture)
- [Getting started (Docker)](#getting-started-docker)
- [Environment variables](#environment-variables)
- [NPM scripts](#npm-scripts)
- [API surface (suggested)](#api-surface-suggested)
- [Roadmap](#roadmap)

---

## Tech stack

| Layer          | Technology                          |
|----------------|--------------------------------------|
| Runtime        | Node.js (ESM, `type: module`)        |
| Language       | TypeScript 5                         |
| Web framework  | Express 5                            |
| ORM            | Drizzle ORM + Drizzle Kit            |
| Database       | PostgreSQL 17 (Alpine)               |
| Auth           | JSON Web Tokens (`jsonwebtoken`)     |
| Dev tooling    | `tsc-watch` (hot reload for `dev`)   |
| Containerization | Docker + Docker Compose            |

---

## Project structure

The `docker-compose.yml` mounts `./src` and `./dist`, and the `dev` script rebuilds on file change (`tsc-watch --onSuccess "node dist/server.js"`). A structure that matches the "one class per service" requirement:

```
eduvision/
├── src/
│   ├── server.ts                 # Express app bootstrap
│   ├── config/
│   │   ├── env.ts                # env var loading/validation
│   │   └── db.ts                 # Drizzle + pg pool setup
│   ├── db/
│   │   ├── schema/                # Drizzle table definitions (1 file per entity)
│   │   │   ├── users.schema.ts
│   │   │   ├── courses.schema.ts
│   │   │   ├── lessons.schema.ts
│   │   │   ├── quizzes.schema.ts
│   │   │   ├── questions.schema.ts
│   │   │   ├── options.schema.ts
│   │   │   ├── quizAttempts.schema.ts
│   │   │   ├── enrollments.schema.ts
│   │   │   ├── payments.schema.ts
│   │   │   └── certificates.schema.ts
│   │   └── index.ts               # re-exports all schemas
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts    # class AuthService
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.routes.ts
│   │   ├── users/
│   │   │   ├── user.service.ts    # class UserService
│   │   │   ├── user.controller.ts
│   │   │   └── user.routes.ts
│   │   ├── courses/
│   │   │   ├── course.service.ts  # class CourseService
│   │   │   ├── course.controller.ts
│   │   │   └── course.routes.ts
│   │   ├── lessons/
│   │   │   ├── lesson.service.ts  # class LessonService
│   │   │   └── lesson.routes.ts
│   │   ├── quizzes/
│   │   │   ├── quiz.service.ts    # class QuizService
│   │   │   └── quiz.routes.ts
│   │   ├── enrollments/
│   │   │   ├── enrollment.service.ts  # class EnrollmentService
│   │   │   └── enrollment.routes.ts
│   │   ├── payments/
│   │   │   ├── payment.service.ts # class PaymentService
│   │   │   └── payment.routes.ts
│   │   └── certificates/
│   │       ├── certificate.service.ts # class CertificateService
│   │       └── certificate.routes.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # verify JWT, attach req.user
│   │   ├── role.middleware.ts      # restrict by role (admin/instructor/student)
│   │   └── error.middleware.ts     # centralized error handler
│   └── common/
│       ├── errors/                 # custom error classes (NotFoundError, etc.)
│       └── types/
├── drizzle/                        # generated migrations (drizzle-kit)
├── dist/                           # compiled JS output (tsc)
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

Each domain (users, courses, lessons, quizzes, enrollments, payments, certificates) gets **its own service class**, plus its own controller and route file. Controllers stay thin (parse request → call service → format response); all business logic and DB access lives in the service class.

---

## Database schema (ERD)

Derived from the provided diagram — 10 tables:

```
USERS                    COURSES                   LESSONS
─────────────            ─────────────              ─────────────
id (PK)                  id (PK)                    id (PK)
name                      title, price               course_id (FK) ──▶ COURSES
email                     instructor_id (FK) ──▶ USERS   title, duration_sec
role


QUIZZES                  QUESTIONS                  OPTIONS
─────────────            ─────────────              ─────────────
id (PK)                  id (PK)                    id (PK)
lesson_id (FK) ──▶ LESSONS   quiz_id (FK) ──▶ QUIZZES    question_id (FK) ──▶ QUESTIONS
title                     question_text              is_correct


QUIZ_ATTEMPTS             ENROLLMENTS                PAYMENTS
─────────────             ─────────────              ─────────────
id (PK)                   id (PK)                    id (PK)
user_id (FK) ──▶ USERS     user_id (FK) ──▶ USERS     user_id (FK) ──▶ USERS
quiz_id (FK) ──▶ QUIZZES   course_id (FK) ──▶ COURSES course_id (FK) ──▶ COURSES
score                      progress_pct               status


CERTIFICATES
─────────────
id (PK)
user_id (FK) ──▶ USERS
course_id (FK) ──▶ COURSES
issued_at
```

**Relationships:**
- A `USER` (role = instructor) **teaches** many `COURSES`.
- A `COURSE` **has many** `LESSONS`.
- A `LESSON` **has one** `QUIZ`, which **has many** `QUESTIONS`, each with many `OPTIONS` (one `is_correct`).
- A `USER` **attempts** many `QUIZZES` → recorded in `QUIZ_ATTEMPTS` (with `score`).
- A `USER` **enrolls** in many `COURSES` → tracked in `ENROLLMENTS` (with `progress_pct`), and pays for them via `PAYMENTS` (with `status`: pending / approved / rejected, matching the admin approval flow in the UI).
- On completing a course, a `CERTIFICATE` row is issued for that `user_id` + `course_id`.

---

## Backend architecture

**Layered, class-based service architecture**, one class per business domain:

- **Controller layer** — Express route handlers; validates input (e.g. with `zod`), calls the matching service, returns HTTP responses. No DB queries here.
- **Service layer (one class per entity/domain)** — owns all business rules and Drizzle queries for that domain, e.g.:
  - `AuthService` — register/login, password hashing, JWT issue/verify.
  - `UserService` — CRUD, ban/unban, role management (admin panel).
  - `CourseService` — CRUD, pricing, instructor assignment.
  - `LessonService` — CRUD, ordering, lock/unlock logic per enrollment progress.
  - `QuizService` — quiz + questions + options CRUD, grading logic (`QuizAttemptService` can be split out if it grows).
  - `EnrollmentService` — enroll user, update `progress_pct` as lessons/quizzes are completed.
  - `PaymentService` — create payment (receipt upload), admin approve/reject, ties into `EnrollmentService` on approval.
  - `CertificateService` — issue certificate once `progress_pct = 100`.
- **Data layer** — Drizzle ORM schema + `pg` pool, injected into services (constructor injection) so they're unit-testable.
- **Middleware** — JWT auth guard, role-based access guard (admin / instructor / student), centralized error handler.

Example service skeleton:

```ts
// src/modules/courses/course.service.ts
import { db } from "../../config/db.js";
import { courses } from "../../db/schema/courses.schema.js";
import { eq } from "drizzle-orm";

export class CourseService {
  async findAll() {
    return db.select().from(courses);
  }

  async findById(id: number) {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course ?? null;
  }

  async create(data: { title: string; price: number; instructorId: number }) {
    const [course] = await db.insert(courses).values(data).returning();
    return course;
  }
}
```

Controllers then instantiate (or receive via DI) the service:

```ts
// src/modules/courses/course.controller.ts
import { Request, Response } from "express";
import { CourseService } from "./course.service.js";

const courseService = new CourseService();

export async function listCourses(_req: Request, res: Response) {
  const data = await courseService.findAll();
  res.json(data);
}
```

---

## Getting started (Docker)

```bash
docker compose up --build
```

This will:
1. Start the `db` service — PostgreSQL 17, exposed on host port **5433** (container port 5432).
2. Build and start the `eduvision` API service, exposed on host port **4000**.
3. Run `npm run db:push` (Drizzle Kit push) before starting the dev server, so the schema is synced against the database on every boot.

The API will hot-reload on changes to `./src` thanks to the mounted volume + `tsc-watch`.

> ⚠️ `npm run db:push` is referenced in `docker-compose.yml` but isn't currently defined in `package.json` — add it, e.g.: `"db:push": "drizzle-kit push"`.

---

## Environment variables

Not yet present in the compose file for the `eduvision` service — it currently only relies on the `db` service's Postgres credentials. You'll want to pass at least:

```env
DATABASE_URL=postgres://eduvision:Ahmed@123@db:5432/eduvision
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
PORT=4000
```

Add an `environment:` block (or an `env_file: .env`) to the `eduvision` service in `docker-compose.yml`, and load it in `src/config/env.ts`.

---

## NPM scripts

| Script  | Description                                              |
|---------|-----------------------------------------------------------|
| `dev`   | Watches TS with `tsc-watch`, restarts `dist/server.js` on success |
| `build` | Compiles TypeScript (`tsc`) to `dist/`                     |
| `start` | Runs the compiled server (`node dist/server.js`)           |

Suggested additions:
```json
"db:push": "drizzle-kit push",
"db:generate": "drizzle-kit generate",
"db:studio": "drizzle-kit studio"
```

---

## API surface (suggested)

| Method | Route                                | Service            |
|--------|----------------------------------------|--------------------|
| POST   | `/api/auth/register`                   | AuthService         |
| POST   | `/api/auth/login`                      | AuthService         |
| GET    | `/api/courses`                         | CourseService       |
| GET    | `/api/courses/:id`                     | CourseService       |
| POST   | `/api/courses` *(instructor/admin)*    | CourseService       |
| GET    | `/api/courses/:id/lessons`             | LessonService       |
| GET    | `/api/lessons/:id/quiz`                | QuizService         |
| POST   | `/api/lessons/:id/quiz/attempt`        | QuizService         |
| POST   | `/api/enrollments`                     | EnrollmentService   |
| GET    | `/api/enrollments/me`                  | EnrollmentService   |
| POST   | `/api/payments` *(receipt upload)*     | PaymentService      |
| PATCH  | `/api/payments/:id/approve` *(admin)*  | PaymentService      |
| PATCH  | `/api/payments/:id/reject` *(admin)*   | PaymentService      |
| GET    | `/api/certificates/me`                 | CertificateService  |
| GET    | `/api/admin/users`                     | UserService         |
| PATCH  | `/api/admin/users/:id/ban`             | UserService         |

---

## Roadmap

- [ ] Add `db:push` script and `.env` support for the API container.
- [ ] Implement Drizzle schema files matching the ERD above.
- [ ] Implement `AuthService` (bcrypt hashing + JWT).
- [ ] Implement lesson-locking logic (a lesson unlocks once the previous lesson's quiz is passed).
- [ ] Payment approval flow: admin approves receipt → auto-create `ENROLLMENT`.
- [ ] Certificate auto-issue when `progress_pct` hits 100%.
- [ ] Add request validation (e.g. `zod`) and centralized error handling middleware.
- [ ] Add tests per service class.
