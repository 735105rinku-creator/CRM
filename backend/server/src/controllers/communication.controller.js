import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  sendMessageSchema,
  sendNotificationSchema,
} from "../validators/communication.validator.js";

import {
  sendMessageService,
  getEmployeeMessageRecipientsService,
  getMessagesService,
  getMessageByIdService,
  markMessageReadService,

  sendNotificationService,
  getNotificationsService,
  getUnreadNotificationCountService,
  markNotificationReadService,
  markAllNotificationsReadService,
} from "../services/communication.service.js";

/* ================= MESSAGES ================= */

export const sendMessage = asyncHandler(async (req, res) => {
  const { value, error } = sendMessageSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await sendMessageService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Message sent successfully")
  );
});

export const getEmployeeMessageRecipients = asyncHandler(async (req, res) => {
  const data = await getEmployeeMessageRecipientsService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Employee chat recipients fetched successfully")
  );
});

export const getMessages = asyncHandler(async (req, res) => {
  const data = await getMessagesService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Messages fetched successfully")
  );
});

export const getMessageById = asyncHandler(async (req, res) => {
  const data = await getMessageByIdService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Message fetched successfully")
  );
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const data = await markMessageReadService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Message marked as read")
  );
});

/* ================= NOTIFICATIONS ================= */

export const sendNotification = asyncHandler(async (req, res) => {
  const { value, error } = sendNotificationSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const data = await sendNotificationService(req.user, value);

  res.status(201).json(
    new ApiResponse(201, data, "Notification sent successfully")
  );
});

export const getNotifications = asyncHandler(async (req, res) => {
  const data = await getNotificationsService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Notifications fetched successfully")
  );
});

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const data = await getUnreadNotificationCountService(req.user);

  res.status(200).json(
    new ApiResponse(200, data, "Unread notification count fetched successfully")
  );
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const data = await markNotificationReadService(req.user, req.params.id);

  res.status(200).json(
    new ApiResponse(200, data, "Notification marked as read")
  );
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await markAllNotificationsReadService(req.user);

  res.status(200).json(
    new ApiResponse(200, null, "All notifications marked as read")
  );
});
