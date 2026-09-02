import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  createMeetingSchema,
  updateMeetingSchema,
  updateMeetingStatusSchema,
} from "../validators/meeting.validator.js";

import {
  createMeetingService,
  getMeetingsService,
  getMeetingByIdService,
  updateMeetingService,
  updateMeetingStatusService,
  joinMeetingService,
  leaveMeetingService,
  approveMeetingJoinService,
  sendMeetingMessageService,
  getMeetingMessagesService,
  deleteMeetingService,
  getMeetingDashboardService,
} from "../services/meeting.service.js";

export const createMeeting = asyncHandler(async (req, res) => {
  const { value, error } = createMeetingSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await createMeetingService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Meeting created successfully")
  );
});

export const getMeetings = asyncHandler(async (req, res) => {
  const data = await getMeetingsService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Meetings fetched successfully")
  );
});

export const getMeetingById = asyncHandler(async (req, res) => {
  const data = await getMeetingByIdService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting fetched successfully")
  );
});

export const updateMeeting = asyncHandler(async (req, res) => {
  const { value, error } = updateMeetingSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateMeetingService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting updated successfully")
  );
});

export const updateMeetingStatus = asyncHandler(async (req, res) => {
  const { value, error } = updateMeetingStatusSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await updateMeetingStatusService(req.user, req.params.id, value);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting status updated successfully")
  );
});

export const joinMeeting = asyncHandler(async (req, res) => {
  const data = await joinMeetingService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting join notification sent successfully")
  );
});

export const leaveMeeting = asyncHandler(async (req, res) => {
  const data = await leaveMeetingService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting left successfully")
  );
});

export const approveMeetingJoin = asyncHandler(async (req, res) => {
  const data = await approveMeetingJoinService(req.user, req.params.id, req.body);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting join request updated successfully")
  );
});

export const sendMeetingMessage = asyncHandler(async (req, res) => {
  const data = await sendMeetingMessageService(req.user, req.params.id, req.body);

  res.status(201).json(
    new ApiResponse(201, data, "Meeting message sent successfully")
  );
});

export const getMeetingMessages = asyncHandler(async (req, res) => {
  const data = await getMeetingMessagesService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting messages fetched successfully")
  );
});

export const deleteMeeting = asyncHandler(async (req, res) => {
  await deleteMeetingService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, null, "Meeting deleted successfully")
  );
});

export const getMeetingDashboard = asyncHandler(async (req, res) => {
  const data = await getMeetingDashboardService(req.user);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting dashboard fetched successfully")
  );
});
