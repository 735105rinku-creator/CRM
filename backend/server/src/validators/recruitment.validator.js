import Joi from "joi";
import { OFFER_STATUS } from "../models/OfferLetter.js";

import {
  JOB_STATUS,
  JOB_PRIORITY,
} from "../models/JobOpening.js";

import {
  CANDIDATE_STATUS,
  CANDIDATE_SOURCE,
} from "../models/Candidate.js";

import {
  INTERVIEW_MODE,
  INTERVIEW_STATUS,
  INTERVIEW_RESULT,
} from "../models/Interview.js";

const code = Joi.string().trim().uppercase().min(1).max(50);
const optionalCode = code.allow("", null);

const salaryRangeSchema = Joi.object({
  min: Joi.number().min(0).default(0),
  max: Joi.number().min(0).default(0),
  currency: Joi.string().trim().uppercase().default("INR"),
});

const experienceRangeSchema = Joi.object({
  minYears: Joi.number().min(0).default(0),
  maxYears: Joi.number().min(0).default(0),
});

const addressSchema = Joi.object({
  addressLine1: Joi.string().trim().allow("", null),
  addressLine2: Joi.string().trim().allow("", null),
  city: Joi.string().trim().allow("", null),
  state: Joi.string().trim().allow("", null),
  country: Joi.string().trim().allow("", null),
  pincode: Joi.string().trim().allow("", null),
});

const withRecruitmentAliases = (schema) => {
  return schema
    .rename("branchcode", "branchCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("branch_code", "branchCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("departmentcode", "departmentCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("department_code", "departmentCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("designationcode", "designationCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("designation_code", "designationCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("hiringmanagercode", "hiringManagerCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("hiring_manager_code", "hiringManagerCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("hiringmanageremployeecode", "hiringManagerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("hiring_manager_employee_code", "hiringManagerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("jobcode", "jobCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("job_code", "jobCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("candidatecode", "candidateCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("candidate_code", "candidateCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employeecode", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("employee_code", "employeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("referredbyemployeecode", "referredByEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("referred_by_employee_code", "referredByEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("recruitercode", "recruiterCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("recruiter_code", "recruiterCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("recruiteremployeecode", "recruiterEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("recruiter_employee_code", "recruiterEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("intervieweremployeecode", "interviewerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("interviewer_employee_code", "interviewerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("reportingmanagercode", "reportingManagerCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("reporting_manager_code", "reportingManagerCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("reportingmanageremployeecode", "reportingManagerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("reporting_manager_employee_code", "reportingManagerEmployeeCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("shiftcode", "shiftCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("shift_code", "shiftCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leavepolicycode", "leavePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("leave_policy_code", "leavePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("attendancepolicycode", "attendancePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("attendance_policy_code", "attendancePolicyCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("salarystructurecode", "salaryStructureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("salary_structure_code", "salaryStructureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("structurecode", "structureCode", {
      ignoreUndefined: true,
      override: true,
    })
    .rename("structure_code", "structureCode", {
      ignoreUndefined: true,
      override: true,
    });
};

/* ---------------- Job Opening ---------------- */

const jobOpeningBaseSchema = {
  branchCode: optionalCode,

  departmentCode: optionalCode,

  designationCode: optionalCode,

  hiringManagerCode: optionalCode,
  hiringManagerEmployeeCode: optionalCode,

  jobTitle: Joi.string().trim().min(2).max(150),

  employmentType: Joi.string()
    .valid(
      "permanent",
      "probation",
      "contract",
      "intern",
      "consultant",
      "part_time",
      "freelancer"
    )
    .default("permanent"),

  workMode: Joi.string()
    .valid("office", "remote", "hybrid", "field")
    .default("office"),

  location: Joi.string().trim().allow("", null),

  vacancies: Joi.number().integer().min(1).default(1),

  experience: experienceRangeSchema.default({}),

  salaryRange: salaryRangeSchema.default({}),

  requiredSkills: Joi.array().items(Joi.string().trim()).default([]),

  preferredSkills: Joi.array().items(Joi.string().trim()).default([]),

  education: Joi.string().trim().allow("", null),

  jobDescription: Joi.string().trim().allow("", null),

  responsibilities: Joi.array().items(Joi.string().trim()).default([]),

  requirements: Joi.array().items(Joi.string().trim()).default([]),

  benefits: Joi.array().items(Joi.string().trim()).default([]),

  openingDate: Joi.date().allow(null),

  closingDate: Joi.date().allow(null),

  status: Joi.string()
    .valid(...Object.values(JOB_STATUS))
    .default(JOB_STATUS.DRAFT),

  priority: Joi.string()
    .valid(...Object.values(JOB_PRIORITY))
    .default(JOB_PRIORITY.MEDIUM),

  sourceBudget: Joi.number().min(0).default(0),

  notes: Joi.string().trim().allow("", null),
};

export const createJobOpeningSchema = withRecruitmentAliases(
  Joi.object({
    ...jobOpeningBaseSchema,
    jobTitle: jobOpeningBaseSchema.jobTitle.required(),
  })
);

export const updateJobOpeningSchema = withRecruitmentAliases(
  Joi.object(jobOpeningBaseSchema)
);

export const updateJobStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(JOB_STATUS))
    .required(),
});

/* ---------------- Candidate ---------------- */

const candidateBaseSchema = {
  jobCode: optionalCode,

  firstName: Joi.string().trim().min(2),
  middleName: Joi.string().trim().allow("", null),
  lastName: Joi.string().trim().min(2),

  photo: Joi.string().trim().allow("", null),

  gender: Joi.string()
    .valid("male", "female", "other", "prefer_not_to_say")
    .default("prefer_not_to_say"),

  dateOfBirth: Joi.date().allow(null),

  email: Joi.string().email().lowercase().trim().allow("", null),

  mobile: Joi.string().trim(),

  alternateMobile: Joi.string().trim().allow("", null),

  linkedinUrl: Joi.string().trim().allow("", null),

  githubUrl: Joi.string().trim().allow("", null),

  portfolioUrl: Joi.string().trim().allow("", null),

  currentAddress: addressSchema.default({}),
  permanentAddress: addressSchema.default({}),

  totalExperience: Joi.number().min(0).default(0),

  currentCompany: Joi.string().trim().allow("", null),

  currentDesignation: Joi.string().trim().allow("", null),

  currentCTC: Joi.number().min(0).allow(null),

  expectedCTC: Joi.number().min(0).allow(null),

  noticePeriodDays: Joi.number().integer().min(0).allow(null),

  currentLocation: Joi.string().trim().allow("", null),

  preferredLocation: Joi.string().trim().allow("", null),

  education: Joi.array()
    .items(
      Joi.object({
        qualification: Joi.string().trim().allow("", null),
        specialization: Joi.string().trim().allow("", null),
        institute: Joi.string().trim().allow("", null),
        university: Joi.string().trim().allow("", null),
        passingYear: Joi.number().integer().allow(null),
        percentage: Joi.number().min(0).max(100).allow(null),
      })
    )
    .default([]),

  experienceHistory: Joi.array()
    .items(
      Joi.object({
        companyName: Joi.string().trim().allow("", null),
        designation: Joi.string().trim().allow("", null),
        startDate: Joi.date().allow(null),
        endDate: Joi.date().allow(null),
        currentlyWorking: Joi.boolean().default(false),
        description: Joi.string().trim().allow("", null),
      })
    )
    .default([]),

  skills: Joi.array().items(Joi.string().trim()).default([]),

  certifications: Joi.array().items(Joi.string().trim()).default([]),

  languages: Joi.array().items(Joi.string().trim()).default([]),

  resumeUrl: Joi.string().trim().allow("", null),

  coverLetter: Joi.string().trim().allow("", null),

  source: Joi.string()
    .valid(...Object.values(CANDIDATE_SOURCE))
    .default(CANDIDATE_SOURCE.CAREER_PORTAL),

  referredByEmployeeCode: optionalCode,

  recruiterCode: optionalCode,
  recruiterEmployeeCode: optionalCode,

  status: Joi.string()
    .valid(...Object.values(CANDIDATE_STATUS))
    .default(CANDIDATE_STATUS.APPLIED),

  overallRating: Joi.number().min(0).max(5).default(0),

  remarks: Joi.string().trim().allow("", null),
};

export const createCandidateSchema = withRecruitmentAliases(
  Joi.object({
    ...candidateBaseSchema,
    jobCode: code.required(),
    firstName: candidateBaseSchema.firstName.required(),
    lastName: candidateBaseSchema.lastName.required(),
    mobile: candidateBaseSchema.mobile.required(),
  })
);

export const updateCandidateSchema = withRecruitmentAliases(
  Joi.object(candidateBaseSchema)
);

export const updateCandidateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(CANDIDATE_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});

/* ---------------- Interview ---------------- */

const panelMemberSchema = withRecruitmentAliases(
  Joi.object({
    employeeCode: optionalCode,

    name: Joi.string().trim().allow("", null),

    email: Joi.string().email().lowercase().trim().allow("", null),

    role: Joi.string().trim().allow("", null),
  })
);

const feedbackSchema = withRecruitmentAliases(
  Joi.object({
    interviewerEmployeeCode: optionalCode,
    employeeCode: optionalCode,

    technicalRating: Joi.number().min(0).max(5).default(0),

    communicationRating: Joi.number().min(0).max(5).default(0),

    cultureFitRating: Joi.number().min(0).max(5).default(0),

    overallRating: Joi.number().min(0).max(5).default(0),

    strengths: Joi.string().trim().allow("", null),

    weaknesses: Joi.string().trim().allow("", null),

    remarks: Joi.string().trim().allow("", null),

    recommendation: Joi.string()
      .valid("hire", "reject", "hold", "next_round", "")
      .default(""),

    submittedAt: Joi.date().allow(null),
  })
);

const interviewBaseSchema = {
  candidateCode: optionalCode,

  jobCode: optionalCode,

  roundName: Joi.string().trim().min(2).default("Round 1"),

  roundNumber: Joi.number().integer().min(1).default(1),

  interviewMode: Joi.string()
    .valid(...Object.values(INTERVIEW_MODE))
    .default(INTERVIEW_MODE.ONLINE),

  scheduledDate: Joi.date(),

  startTime: Joi.string().trim(),

  endTime: Joi.string().trim().allow("", null),

  durationMinutes: Joi.number().integer().min(5).default(30),

  location: Joi.string().trim().allow("", null),

  meetingLink: Joi.string().trim().allow("", null),

  agenda: Joi.string().trim().allow("", null),

  panelMembers: Joi.array().items(panelMemberSchema).default([]),

  feedback: Joi.array().items(feedbackSchema).default([]),

  status: Joi.string()
    .valid(...Object.values(INTERVIEW_STATUS))
    .default(INTERVIEW_STATUS.SCHEDULED),

  result: Joi.string()
    .valid(...Object.values(INTERVIEW_RESULT))
    .default(INTERVIEW_RESULT.PENDING),

  finalRemarks: Joi.string().trim().allow("", null),
};

export const createInterviewSchema = withRecruitmentAliases(
  Joi.object({
    ...interviewBaseSchema,
    candidateCode: code.required(),
    jobCode: code.required(),
    scheduledDate: interviewBaseSchema.scheduledDate.required(),
    startTime: interviewBaseSchema.startTime.required(),
  })
);

export const updateInterviewSchema = withRecruitmentAliases(
  Joi.object(interviewBaseSchema)
);

export const updateInterviewResultSchema = withRecruitmentAliases(
  Joi.object({
    status: Joi.string()
      .valid(...Object.values(INTERVIEW_STATUS))
      .required(),

    result: Joi.string()
      .valid(...Object.values(INTERVIEW_RESULT))
      .required(),

    feedback: Joi.array().items(feedbackSchema).default([]),

    finalRemarks: Joi.string().trim().allow("", null),

    rescheduleReason: Joi.string().trim().allow("", null),

    cancelledReason: Joi.string().trim().allow("", null),
  })
);

/* ---------------- Offer Letter ---------------- */

const offerSalarySchema = Joi.object({
  basic: Joi.number().min(0).default(0),

  hra: Joi.number().min(0).default(0),

  allowances: Joi.number().min(0).default(0),

  bonus: Joi.number().min(0).default(0),

  grossSalary: Joi.number().min(0).default(0),

  deductions: Joi.number().min(0).default(0),

  netSalary: Joi.number().min(0).default(0),

  ctc: Joi.number().min(0).default(0),

  currency: Joi.string().trim().uppercase().default("INR"),
});

const offerBaseSchema = {
  candidateCode: optionalCode,

  jobCode: optionalCode,

  joiningDate: Joi.date(),

  offerDate: Joi.date().default(() => new Date()),

  validTill: Joi.date().allow(null),

  probationMonths: Joi.number().integer().min(0).default(6),

  noticePeriodDays: Joi.number().integer().min(0).default(30),

  salary: offerSalarySchema,

  offerPdfUrl: Joi.string().trim().allow("", null),

  terms: Joi.string().trim().allow("", null),

  remarks: Joi.string().trim().allow("", null),
};

export const createOfferSchema = withRecruitmentAliases(
  Joi.object({
    ...offerBaseSchema,
    candidateCode: code.required(),
    jobCode: code.required(),
    joiningDate: offerBaseSchema.joiningDate.required(),
    salary: offerBaseSchema.salary.required(),
  })
);

export const updateOfferSchema = withRecruitmentAliases(Joi.object(offerBaseSchema));

export const updateOfferStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(OFFER_STATUS))
    .required(),

  remarks: Joi.string().trim().allow("", null),
});

export const acceptOfferSchema = Joi.object({
  joiningDate: Joi.date().required(),
});

/* ---------------- Candidate Conversion ---------------- */

export const convertCandidateSchema = withRecruitmentAliases(
  Joi.object({
    reportingManagerCode: optionalCode,
    reportingManagerEmployeeCode: optionalCode,

    branchCode: optionalCode,

    departmentCode: optionalCode,

    designationCode: optionalCode,

    workLocation: Joi.string().trim().allow("", null),

    workMode: Joi.string()
      .valid("office", "remote", "hybrid", "field")
      .default("office"),

    shiftCode: optionalCode,

    leavePolicyCode: optionalCode,
    leavePolicyCodeValue: optionalCode,

    attendancePolicyCode: optionalCode,

    salaryStructureCode: optionalCode,
    structureCode: optionalCode,

    sendWelcomeEmail: Joi.boolean().default(true),
  })
);