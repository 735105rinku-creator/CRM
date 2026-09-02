import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createEventSchema,
  updateEventSchema,
  updateEventStatusSchema,
} from "../validators/event.validator.js";

import {
  createEventService,
  getEventsService,
  getEventByIdService,
  updateEventService,
  updateEventStatusService,
  deleteEventService,
  getEventDashboardService,
} from "../services/event.service.js";

export const createEvent = asyncHandler(async (req, res) => {
  const { value, error } = createEventSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createEventService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Event created successfully")
  );
});

export const getEvents = asyncHandler(async (req, res) => {
  const data = await getEventsService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Events fetched successfully")
  );
});

export const getEventById = asyncHandler(async (req, res) => {
  const data = await getEventByIdService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Event fetched successfully")
  );
});

export const updateEvent = asyncHandler(async (req, res) => {
  const { value, error } = updateEventSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateEventService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Event updated successfully")
  );
});

export const updateEventStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateEventStatusSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateEventStatusService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Event status updated successfully")
  );
});

export const deleteEvent = asyncHandler(async (req, res) => {
  await deleteEventService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, null, "Event deleted successfully")
  );
});

export const getEventDashboard = asyncHandler(async (req, res) => {
  const data = await getEventDashboardService(req.user);

  res.status(200).json(
    new ApiResponse(200, data, "Event dashboard fetched successfully")
  );
});