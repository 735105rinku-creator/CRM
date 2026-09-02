import mongoose from "mongoose";

export const EVENT_TYPE = Object.freeze({
  COMPANY_EVENT: "company_event",
  ANNOUNCEMENT: "announcement",
  HOLIDAY: "holiday",
  BIRTHDAY: "birthday",
  WORK_ANNIVERSARY: "work_anniversary",
  TRAINING: "training",
  SEMINAR: "seminar",
  WEBINAR: "webinar",
  MEETING: "meeting",
  TOWNHALL: "townhall",
  FESTIVAL: "festival",
  OTHER: "other",
});

export const EVENT_STATUS = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
});

const participantSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    status: {
      type: String,
      enum: ["invited", "accepted", "declined", "attended"],
      default: "invited",
    },
  },
  { _id: false }
);

const hrEventSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    eventTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    eventCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 30,
    },

    eventType: {
      type: String,
      enum: Object.values(EVENT_TYPE),
      default: EVENT_TYPE.COMPANY_EVENT,
      index: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    venue: {
      type: String,
      default: "",
      trim: true,
    },

    meetingLink: {
      type: String,
      default: "",
      trim: true,
    },

    bannerImage: {
      type: String,
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

    allDay: {
      type: Boolean,
      default: false,
    },

    participants: {
      type: [participantSchema],
      default: [],
    },

    notifyEmployees: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.DRAFT,
      index: true,
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
  {
    timestamps: true,
  }
);

hrEventSchema.index(
  {
    companyId: 1,
    eventCode: 1,
  },
  {
    unique: true,
  }
);

hrEventSchema.index({
  companyId: 1,
  startDateTime: 1,
});

export const HREvent = mongoose.model("HREvent", hrEventSchema);

