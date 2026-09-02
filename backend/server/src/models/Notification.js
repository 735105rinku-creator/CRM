import mongoose from "mongoose";

export const NOTIFICATION_TYPE = Object.freeze({
  MESSAGE: "message",
  LEAVE: "leave",
  ATTENDANCE: "attendance",
  PAYROLL: "payroll",
  MEETING: "meeting",
  EVENT: "event",
  HOLIDAY: "holiday",
  SYSTEM: "system",
});

export const NOTIFICATION_PRIORITY = Object.freeze({
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
});

const notificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      default: NOTIFICATION_TYPE.SYSTEM,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    entityType: {
      type: String,
      trim: true,
      default: "",
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITY),
      default: NOTIFICATION_PRIORITY.NORMAL,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    actionUrl: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({
  companyId: 1,
  recipientUserId: 1,
  isRead: 1,
});

notificationSchema.index({
  companyId: 1,
  recipientUserId: 1,
  createdAt: -1,
});

export const Notification = mongoose.model(
  "Notification",
  notificationSchema
);