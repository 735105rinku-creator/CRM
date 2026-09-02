import mongoose from "mongoose";

export const JOB_STATUS = Object.freeze({
  DRAFT: "draft",
  OPEN: "open",
  PAUSED: "paused",
  CLOSED: "closed",
  CANCELLED: "cancelled",
  FILLED: "filled",
});

export const JOB_PRIORITY = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
});

const salaryRangeSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      default: 0,
      min: 0,
    },

    max: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    minYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxYears: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const jobOpeningSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },

    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      default: null,
      index: true,
    },

    hiringManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
      index: true,
    },

    jobCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    jobTitle: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    employmentType: {
      type: String,
      enum: [
        "permanent",
        "probation",
        "contract",
        "intern",
        "consultant",
        "part_time",
        "freelancer",
      ],
      default: "permanent",
    },

    workMode: {
      type: String,
      enum: ["office", "remote", "hybrid", "field"],
      default: "office",
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    vacancies: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    experience: {
      type: experienceSchema,
      default: {},
    },

    salaryRange: {
      type: salaryRangeSchema,
      default: {},
    },

    requiredSkills: {
      type: [String],
      default: [],
    },

    preferredSkills: {
      type: [String],
      default: [],
    },

    education: {
      type: String,
      trim: true,
      default: "",
    },

    jobDescription: {
      type: String,
      trim: true,
      default: "",
    },

    responsibilities: {
      type: [String],
      default: [],
    },

    requirements: {
      type: [String],
      default: [],
    },

    benefits: {
      type: [String],
      default: [],
    },

    openingDate: {
      type: Date,
      default: Date.now,
    },

    closingDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(JOB_STATUS),
      default: JOB_STATUS.DRAFT,
      index: true,
    },

    priority: {
      type: String,
      enum: Object.values(JOB_PRIORITY),
      default: JOB_PRIORITY.MEDIUM,
    },

    sourceBudget: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
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

jobOpeningSchema.index({ companyId: 1, jobCode: 1 }, { unique: true });
jobOpeningSchema.index({ companyId: 1, status: 1 });
jobOpeningSchema.index({ companyId: 1, departmentId: 1 });
jobOpeningSchema.index({ companyId: 1, designationId: 1 });
jobOpeningSchema.index({ jobTitle: "text", jobCode: "text" });

export const JobOpening = mongoose.model("JobOpening", jobOpeningSchema);