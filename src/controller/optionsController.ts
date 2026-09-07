import { Request } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { OptionsService } from "../service/optionsService.js";
import { AppError } from "../errors/AppError.js";

const optionsService = new OptionsService();

export const checkAnswer = asyncHandler(async (req: Request, res) => {
  const { question_id, option_id } = req.body;
  if (!question_id || !option_id) {
    throw new AppError("question_id and option_id are required", 400);
  }
  const result = await optionsService.checkAnswer(question_id, option_id);
  res.status(200).json({ success: true, data: result });
});

export const addOption = asyncHandler(async (req: Request, res) => {
  const option = await optionsService.addOption(req.body);
  res.status(201).json({ success: true, data: option });
});

export const getAllOptions = asyncHandler(async (_req: Request, res) => {
  const options = await optionsService.getAllOptions();
  res.status(200).json({ success: true, data: options });
});

export const getOptionsByQuestion = asyncHandler(async (req: Request, res) => {
  const question_id = req.params.question_id as string;
  const options = await optionsService.getOptionsByQuestion(question_id);
  res
    .status(200)
    .json({ success: true, data: options, count: options.length });
});

export const getOptionById = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const option = await optionsService.getOptionById(id);
  if (!option) {
    throw new AppError("Option not found", 404);
  }
  res.status(200).json({ success: true, data: option });
});

export const updateOption = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const option = await optionsService.updateOption(
    id,
    req.body.question_id,
    req.body
  );
  if (!option) {
    throw new AppError("Option not found", 404);
  }
  res.status(200).json({ success: true, data: option });
});

export const deleteOption = asyncHandler(async (req: Request, res) => {
  const id = req.params.id as string;
  const option = await optionsService.deleteOption(id, req.body.question_id);
  if (!option) {
    throw new AppError("Option not found", 404);
  }
  res.status(200).json({ success: true, data: option });
});