import mongoose from "mongoose";

export const CANDIDATE_STATUS = Object.freeze({
  APPLIED: "applied",
  SHORTLISTED: "shortlisted",
  INTERVIEW_SCHEDULED: "interview_scheduled",
  INTERVIEWED: "interviewed",
  SELECTED: "selected",
  REJECTED: "rejected",
  OFFER_SENT: "offer_sent",
  OFFER_ACCEPTED: "offer_accepted",
  JOINED: "joined",
  NO_SHOW: "no_show",
  ON_HOLD: "on_hold",
});

export const CANDIDATE_SOURCE = Object.freeze({
  CAREER_PORTAL: "career_portal",
  LINKEDIN: "linkedin",
  NAUKRI: "naukri",
  INDEED: "indeed",
  REFERRAL: "referral",
  CONSULTANCY: "consultancy",
  WALK_IN: "walk_in",
  CAMPUS: "campus",
  OTHER: "other",
});

const addressSchema = new mongoose.Schema(
  {
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    country: {
      type: String,
      default: "India",
    },
    pincode: String,
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    qualification: String,
    specialization: String,
    institute: String,
    university: String,
    passingYear: Number,
    percentage: Number,
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    companyName: String,
    designation: String,
    startDate: Date,
    endDate: Date,
    currentlyWorking: Boolean,
    description: String,
  },
  { _id: false }
);

const candidateSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    candidateCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    appliedJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOpening",
      required: true,
      index: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      default: "",
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
      trim: true,
    },

    photo: {
      type: String,
      default: "",
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },

    dateOfBirth: Date,

    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    mobile: {
      type: String,
      required: true,
      index: true,
    },

    alternateMobile: String,

    linkedinUrl: String,

    githubUrl: String,

    portfolioUrl: String,

    currentAddress: {
      type: addressSchema,
      default: {},
    },

    permanentAddress: {
      type: addressSchema,
      default: {},
    },

    totalExperience: {
      type: Number,
      default: 0,
    },

    currentCompany: String,

    currentDesignation: String,

    currentCTC: Number,

    expectedCTC: Number,

    noticePeriodDays: Number,

    currentLocation: String,

    preferredLocation: String,

    education: {
      type: [educationSchema],
      default: [],
    },

    experienceHistory: {
      type: [experienceSchema],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    certifications: {
      type: [String],
      default: [],
    },

    languages: {
      type: [String],
      default: [],
    },

    resumeUrl: String,

    coverLetter: String,

    source: {
      type: String,
      enum: Object.values(CANDIDATE_SOURCE),
      default: CANDIDATE_SOURCE.CAREER_PORTAL,
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(CANDIDATE_STATUS),
      default: CANDIDATE_STATUS.APPLIED,
      index: true,
    },

    overallRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    remarks: {
      type: String,
      default: "",
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    joinedOn: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

candidateSchema.pre("validate", async function () {
  this.fullName = [
    this.firstName,
    this.middleName,
    this.lastName,
  ]
    .filter(Boolean)
    .join(" ");
});

candidateSchema.index(
  {
    companyId: 1,
    candidateCode: 1,
  },
  {
    unique: true,
  }
);

candidateSchema.index({
  companyId: 1,
  email: 1,
});

candidateSchema.index({
  companyId: 1,
  mobile: 1,
});

candidateSchema.index({
  fullName: "text",
  currentCompany: "text",
  currentDesignation: "text",
});

export const Candidate = mongoose.model(
  "Candidate",
  candidateSchema
);