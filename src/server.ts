import express from "express";
import authRouter from "./modules/auth/auth.router.js";
import courseRouter from "./modules/course/course.router.js";
import lessonsRouter from "./modules/lesson/lesson.router.js";
import quizzesRouter from "./modules/quiz/quiz.router.js";
import questionsRouter from "./modules/question/question.router.js";
import optionsRouter from "./modules/option/option.router.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "./errors/AppError.js";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/courses", courseRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/quizzes", quizzesRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/options", optionsRouter);

app.use((_req, _res, next) => {
  next(new AppError("Route not found", 404, { isOperational: true }));
});

app.use(errorHandler);

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
