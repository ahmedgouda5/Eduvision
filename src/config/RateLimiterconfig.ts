import rateLimit from "express-rate-limit";

export const apiRequestLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1, // limit each IP to 100 requests per windowMs
  message: JSON.stringify({
    message: "Too many requests from this IP, please try again later",
    status: "fail",
    statusCode: 429,
    error: "Too many requests from this IP, please try again later",
    timestamp: new Date().toISOString(),
    isOperational: true,
    code: 429,
  }),
});
