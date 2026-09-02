import mongoose from "mongoose";

export const MEETING_MODE = Object.freeze({
  OFFLINE: "offline",
  ONLINE: "online",
  HYBRID: "hybrid",
});

export const MEETING_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  RESCHEDULED: "rescheduled",
});

const attendeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["invited", "requested", "accepted", "declined", "attended", "absent"],
      default: "invited",
    },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    senderName: {
      type: String,
      trim: true,
      default: "",
    },

    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const agendaItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const actionItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
  },
  { _id: true }
);

const hrMeetingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    meetingTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    meetingCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    meetingMode: {
      type: String,
      enum: Object.values(MEETING_MODE),
      default: MEETING_MODE.ONLINE,
      index: true,
    },

    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },

    venue: {
      type: String,
      trim: true,
      default: "",
    },

    startDateTime: {
      type: Date,
      required: true,
      index: true,
    },

    endDateTime: {
      type: Date,
      required: true,
    },

    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    attendees: {
      type: [attendeeSchema],
      default: [],
    },

    agenda: {
      type: [agendaItemSchema],
      default: [],
    },

    minutesOfMeeting: {
      type: String,
      trim: true,
      default: "",
    },

    actionItems: {
      type: [actionItemSchema],
      default: [],
    },

    chatMessages: {
      type: [chatMessageSchema],
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(MEETING_STATUS),
      default: MEETING_STATUS.SCHEDULED,
      index: true,
    },

    notifyAttendees: {
      type: Boolean,
      default: true,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

hrMeetingSchema.index({ companyId: 1, meetingCode: 1 }, { unique: true });
hrMeetingSchema.index({ companyId: 1, startDateTime: 1 });
hrMeetingSchema.index({ companyId: 1, status: 1 });

export const HRMeeting = mongoose.model("HRMeeting", hrMeetingSchema);



