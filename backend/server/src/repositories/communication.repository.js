import { Message } from "../models/Message.js";
import { Notification } from "../models/Notification.js";

/* ================= MESSAGES ================= */

export const createMessageRecord = async (payload) => {
  return Message.create(payload);
};

export const findMessageById = async (id) => {
  return Message.findById(id)
    .populate("senderUserId", "name email role")
    .populate("recipientUserId", "name email role");
};

export const listMessages = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Message.find(filter)
      .populate("senderUserId", "name email role")
      .populate("recipientUserId", "name email role")
      .populate("parentMessageId", "subject")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Message.countDocuments(filter),
  ]);

  return {
    messages: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateMessageById = async (id, payload) => {
  return Message.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

/* ================= NOTIFICATIONS ================= */

export const createNotificationRecord = async (payload) => {
  return Notification.create(payload);
};

export const findNotificationById = async (id) => {
  return Notification.findById(id);
};

export const listNotifications = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    Notification.find(filter)
      .populate("senderUserId", "name email role")
      .populate("recipientUserId", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments(filter),
  ]);

  return {
    notifications: rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateNotificationById = async (id, payload) => {
  return Notification.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const markAllNotificationsRead = async ({
  companyId,
  recipientUserId,
}) => {
  const filter = {
    recipientUserId,
    isRead: false,
  };

  if (companyId) {
    filter.companyId = companyId;
  }

  return Notification.updateMany(filter, {
    isRead: true,
    readAt: new Date(),
  });
};

export const countUnreadNotifications = async ({
  companyId,
  recipientUserId,
}) => {
  const filter = {
    recipientUserId,
    isRead: false,
  };

  if (companyId) {
    filter.companyId = companyId;
  }

  return Notification.countDocuments(filter);
};
