import mongoose from "mongoose";

export const INTERVIEW_MODE = Object.freeze({
  OFFLINE: "offline",
  ONLINE: "online",
  PHONE: "phone",
  VIDEO: "video",
});

export const INTERVIEW_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  RESCHEDULED: "rescheduled",
  NO_SHOW: "no_show",
});

export const INTERVIEW_RESULT = Object.freeze({
  PENDING: "pending",
  PASS: "pass",
  FAIL: "fail",
  HOLD: "hold",
  RESCHEDULE: "reschedule",
});

const panelMemberSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    role: {
      type: String,
      trim: true,
      default: "interviewer",
    },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    technicalRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    communicationRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    cultureFitRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    overallRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    strengths: {
      type: String,
      trim: true,
      default: "",
    },

    weaknesses: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    recommendation: {
      type: String,
      enum: ["hire", "reject", "hold", "next_round", ""],
      default: "",
    },

    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const interviewSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },

    jobOpeningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOpening",
      required: true,
      index: true,
    },

    roundName: {
      type: String,
      required: true,
      trim: true,
      default: "Round 1",
    },

    roundNumber: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    interviewMode: {
      type: String,
      enum: Object.values(INTERVIEW_MODE),
      default: INTERVIEW_MODE.ONLINE,
    },

    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      required: true,
      trim: true,
    },

    endTime: {
      type: String,
      trim: true,
      default: "",
    },

    durationMinutes: {
      type: Number,
      default: 30,
      min: 5,
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },

    agenda: {
      type: String,
      trim: true,
      default: "",
    },

    panelMembers: {
      type: [panelMemberSchema],
      default: [],
    },

    feedback: {
      type: [feedbackSchema],
      default: [],
    },

    status: {
      type: String,
      enum: Object.values(INTERVIEW_STATUS),
      default: INTERVIEW_STATUS.SCHEDULED,
      index: true,
    },

    result: {
      type: String,
      enum: Object.values(INTERVIEW_RESULT),
      default: INTERVIEW_RESULT.PENDING,
      index: true,
    },

    finalRemarks: {
      type: String,
      trim: true,
      default: "",
    },

    rescheduleReason: {
      type: String,
      trim: true,
      default: "",
    },

    cancelledReason: {
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

interviewSchema.index({
  companyId: 1,
  candidateId: 1,
  roundNumber: 1,
});

interviewSchema.index({
  companyId: 1,
  scheduledDate: 1,
  status: 1,
});

interviewSchema.index({
  companyId: 1,
  jobOpeningId: 1,
});

export const Interview = mongoose.model("Interview", interviewSchema);