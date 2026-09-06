import express from "express";
import authRouter from "./router/authRouter.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError } from "./errors/AppError.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRouter);

app.use((_req, _res, next) => {
  next(new AppError("Route not found", 404, { isOperational: true }));
});

app.use(errorHandler);

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
