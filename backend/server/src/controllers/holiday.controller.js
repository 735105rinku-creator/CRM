import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createHolidaySchema,
  updateHolidaySchema,
} from "../validators/holiday.validator.js";

import {
  createHolidayService,
  getHolidaysService,
  getHolidayByIdService,
  updateHolidayService,
  deleteHolidayService,
  getHolidayDashboardService,
} from "../services/holiday.service.js";

export const createHoliday = asyncHandler(async (req, res) => {
  const { value, error } = createHolidaySchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createHolidayService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Holiday created successfully")
  );
});

export const getHolidays = asyncHandler(async (req, res) => {
  const data = await getHolidaysService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Holidays fetched successfully")
  );
});

export const getHolidayById = asyncHandler(async (req, res) => {
  const data = await getHolidayByIdService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Holiday fetched successfully")
  );
});

export const updateHoliday = asyncHandler(async (req, res) => {
  const { value, error } = updateHolidaySchema.validate(req.body);

  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateHolidayService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Holiday updated successfully")
  );
});

export const deleteHoliday = asyncHandler(async (req, res) => {
  await deleteHolidayService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, null, "Holiday deleted successfully")
  );
});

export const getHolidayDashboard = asyncHandler(async (req, res) => {
  const data = await getHolidayDashboardService(req.user);

  res.status(200).json(
    new ApiResponse(200, data, "Holiday dashboard fetched successfully")
  );
});