import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../db/schema/index.js";

// * Uses the same connection config as the app
const pool = new Pool({
  host: process.env.DB_HOST || "db-eduvision",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "eduvision",
  password: process.env.DB_PASSWORD || "Ahmed@123",
  database: process.env.DB_NAME || "eduvision",
});

const db = drizzle({ client: pool, schema });

async function seed() {
  console.log("🌱 Seeding started...\n");

  // ─── 1. Admin user (needed as course owner) ───────────────────────────────
  // We use ON CONFLICT DO NOTHING so re-running the seed is safe
  const [admin] = await db
    .insert(schema.users)
    .values({
      name: "Admin Seeder",
      email: "admin@eduvision.dev",
      password: "hashed_placeholder", // not a real login — just for FK
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();

  // If the admin already existed, fetch it
  const adminUser =
    admin ??
    (await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "admin@eduvision.dev"),
    }));

  if (!adminUser) throw new Error("Could not create or find admin user");
  console.log(`✅ Admin: ${adminUser.id}`);

  // ─── 2. Course ────────────────────────────────────────────────────────────
  const [course] = await db
    .insert(schema.courses)
    .values({
      title: "Introduction to TypeScript",
      price: 199,
      admin_id: adminUser.id,
    })
    .returning();
  console.log(`✅ Course: "${course.title}" → ${course.id}`);

  // ─── 3. Lesson ────────────────────────────────────────────────────────────
  const [lesson] = await db
    .insert(schema.lessons)
    .values({
      course_id: course.id,
      title: "Lesson 1: Types & Interfaces",
      duration_sec: 1800, // 30 minutes
    })
    .returning();
  console.log(`✅ Lesson: "${lesson.title}" → ${lesson.id}`);

  // ─── 4. Quiz ──────────────────────────────────────────────────────────────
  const [quiz] = await db
    .insert(schema.quizzes)
    .values({
      lesson_id: lesson.id,
      title: "TypeScript Basics Quiz",
    })
    .returning();
  console.log(`✅ Quiz: "${quiz.title}" → ${quiz.id}\n`);

  // ─── 5. Questions + Options ───────────────────────────────────────────────
  const questionsData = [
    {
      question_text: "What keyword is used to declare a typed variable in TypeScript?",
      options: [
        { text: "var",    correct: false },
        { text: "let",    correct: false },
        { text: "type",   correct: false },
        { text: "const",  correct: true  }, // ✅
      ],
    },
    {
      question_text: "Which type represents the absence of a value in TypeScript?",
      options: [
        { text: "null",    correct: false },
        { text: "void",    correct: true  }, // ✅
        { text: "never",   correct: false },
        { text: "unknown", correct: false },
      ],
    },
    {
      question_text: "How do you define an interface in TypeScript?",
      options: [
        { text: "type MyInterface = {}",      correct: false },
        { text: "interface MyInterface {}",    correct: true  }, // ✅
        { text: "class MyInterface {}",        correct: false },
        { text: "struct MyInterface {}",       correct: false },
      ],
    },
    {
      question_text: "What does the '?' symbol mean after a property name in a TypeScript interface?",
      options: [
        { text: "The property is required",   correct: false },
        { text: "The property is optional",   correct: true  }, // ✅
        { text: "The property is readonly",   correct: false },
        { text: "The property is nullable",   correct: false },
      ],
    },
    {
      question_text: "Which of the following is a valid TypeScript tuple type?",
      options: [
        { text: "let t: [string, number] = ['hello', 42]", correct: true  }, // ✅
        { text: "let t: (string, number) = ['hello', 42]", correct: false },
        { text: "let t: string[] = ['hello', 42]",         correct: false },
        { text: "let t: Array<string> = ['hello', 42]",    correct: false },
      ],
    },
    {
      question_text: "What is the return type of a function that never returns?",
      options: [
        { text: "void",    correct: false },
        { text: "null",    correct: false },
        { text: "never",   correct: true  }, // ✅
        { text: "undefined", correct: false },
      ],
    },
    {
      question_text: "Which utility type makes all properties of a type optional?",
      options: [
        { text: "Required<T>",  correct: false },
        { text: "Partial<T>",   correct: true  }, // ✅
        { text: "Readonly<T>",  correct: false },
        { text: "Pick<T, K>",   correct: false },
      ],
    },
    {
      question_text: "What is the TypeScript type for a value that can be anything?",
      options: [
        { text: "object",  correct: false },
        { text: "any",     correct: true  }, // ✅
        { text: "unknown", correct: false },
        { text: "never",   correct: false },
      ],
    },
    {
      question_text: "How do you cast a value to a specific type in TypeScript?",
      options: [
        { text: "value.cast<Type>()",   correct: false },
        { text: "(Type) value",         correct: false },
        { text: "value as Type",        correct: true  }, // ✅
        { text: "convert<Type>(value)", correct: false },
      ],
    },
    {
      question_text: "Which access modifier makes a class member accessible only within the class?",
      options: [
        { text: "public",    correct: false },
        { text: "protected", correct: false },
        { text: "private",   correct: true  }, // ✅
        { text: "internal",  correct: false },
      ],
    },
  ];

  for (const q of questionsData) {
    // Insert question
    const [question] = await db
      .insert(schema.questions)
      .values({ quiz_id: quiz.id, question_text: q.question_text })
      .returning();

    // Insert its options
    await db.insert(schema.options).values(
      q.options.map((o) => ({
        question_id: question.id,
        option_text: o.text,
        is_correct: o.correct,
      })),
    );

    console.log(`  📝 Q: "${q.question_text.slice(0, 50)}..."`);
  }

  console.log(`\n✅ Seeded 10 questions with 4 options each.`);
  console.log(`\n📋 Summary:`);
  console.log(`   Quiz ID     : ${quiz.id}`);
  console.log(`   Lesson ID   : ${lesson.id}`);
  console.log(`   Course ID   : ${course.id}`);
  console.log(`\n🌱 Seed complete!`);

  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  pool.end();
  process.exit(1);
});
