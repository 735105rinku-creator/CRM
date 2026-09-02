import { JobOpening } from "../models/JobOpening.js";
import { Candidate } from "../models/Candidate.js";
import { Interview } from "../models/Interview.js";
import { OfferLetter } from "../models/OfferLetter.js";

const normalizeCode = (value) => {
  if (!value) return value;
  return String(value).trim().toUpperCase();
};

const normalizeEmail = (value) => {
  if (!value) return value;
  return String(value).trim().toLowerCase();
};

const normalizeText = (value) => {
  if (!value) return value;
  return String(value).trim();
};

/* ---------------- Job Opening ---------------- */

export const createJobOpeningRecord = async (payload) => {
  return JobOpening.create(payload);
};

export const findJobOpeningById = async (id) => {
  return JobOpening.findById(id);
};

export const findJobOpeningByCode = async (companyId, jobCode) => {
  if (!jobCode) return null;

  return JobOpening.findOne({
    companyId,
    jobCode: normalizeCode(jobCode),
  });
};

export const findLastJobOpeningByCompany = async (companyId) => {
  return JobOpening.findOne({ companyId })
    .sort({ createdAt: -1 })
    .select("jobCode");
};

export const updateJobOpeningById = async (id, payload) => {
  return JobOpening.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteJobOpeningById = async (id) => {
  return JobOpening.findByIdAndDelete(id);
};

export const listJobOpenings = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    JobOpening.find(filter)
      .populate("branchId", "branchName branchCode")
      .populate("departmentId", "departmentName departmentCode")
      .populate("designationId", "designationName designationCode")
      .populate("hiringManagerId", "displayName employeeCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    JobOpening.countDocuments(filter),
  ]);

  return {
    jobs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/* ---------------- Candidate ---------------- */

export const createCandidateRecord = async (payload) => {
  return Candidate.create(payload);
};

export const findCandidateById = async (id) => {
  return Candidate.findById(id);
};

export const findCandidateByCode = async (companyId, candidateCode) => {
  if (!candidateCode) return null;

  return Candidate.findOne({
    companyId,
    candidateCode: normalizeCode(candidateCode),
  });
};

export const findCandidateByEmail = async (companyId, email) => {
  if (!email) return null;

  return Candidate.findOne({
    companyId,
    email: normalizeEmail(email),
  });
};

export const findCandidateByMobile = async (companyId, mobile) => {
  if (!mobile) return null;

  return Candidate.findOne({
    companyId,
    mobile: normalizeText(mobile),
  });
};

export const findLastCandidateByCompany = async (companyId) => {
  return Candidate.findOne({ companyId })
    .sort({ createdAt: -1 })
    .select("candidateCode");
};

export const updateCandidateById = async (id, payload) => {
  return Candidate.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteCandidateById = async (id) => {
  return Candidate.findByIdAndDelete(id);
};

export const listCandidates = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [candidates, total] = await Promise.all([
    Candidate.find(filter)
      .populate("appliedJobId", "jobTitle jobCode status")
      .populate("referredBy", "displayName employeeCode")
      .populate("recruiterId", "displayName employeeCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Candidate.countDocuments(filter),
  ]);

  return {
    candidates,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/* ---------------- Interview ---------------- */

export const createInterviewRecord = async (payload) => {
  return Interview.create(payload);
};

export const findInterviewById = async (id) => {
  return Interview.findById(id);
};

export const updateInterviewById = async (id, payload) => {
  return Interview.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteInterviewById = async (id) => {
  return Interview.findByIdAndDelete(id);
};

export const listInterviews = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [interviews, total] = await Promise.all([
    Interview.find(filter)
      .populate("candidateId", "fullName candidateCode email mobile status")
      .populate("jobOpeningId", "jobTitle jobCode")
      .populate("panelMembers.employeeId", "displayName employeeCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    Interview.countDocuments(filter),
  ]);

  return {
    interviews,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/* ---------------- Offer Letter ---------------- */

export const createOfferRecord = async (payload) => {
  return OfferLetter.create(payload);
};

export const findOfferById = async (id) => {
  return OfferLetter.findById(id);
};

export const findOfferByCandidate = async (companyId, candidateId) => {
  return OfferLetter.findOne({
    companyId,
    candidateId,
  });
};

export const findOfferByNumber = async (companyId, offerNumber) => {
  if (!offerNumber) return null;

  return OfferLetter.findOne({
    companyId,
    offerNumber: normalizeCode(offerNumber),
  });
};

export const findLastOfferByCompany = async (companyId) => {
  return OfferLetter.findOne({ companyId })
    .sort({ createdAt: -1 })
    .select("offerNumber");
};

export const updateOfferById = async (id, payload) => {
  return OfferLetter.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const listOffers = async ({ filter, page, limit, sort }) => {
  const skip = (page - 1) * limit;

  const [offers, total] = await Promise.all([
    OfferLetter.find(filter)
      .populate("candidateId", "fullName candidateCode email mobile status")
      .populate("jobOpeningId", "jobTitle jobCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    OfferLetter.countDocuments(filter),
  ]);

  return {
    offers,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const deleteOfferById = async (id) => {
  return OfferLetter.findByIdAndDelete(id);
};

/* ---------------- Dashboard Helpers ---------------- */

export const countJobOpenings = async (filter) => {
  return JobOpening.countDocuments(filter);
};

export const countCandidates = async (filter) => {
  return Candidate.countDocuments(filter);
};

export const countInterviews = async (filter) => {
  return Interview.countDocuments(filter);
};

export const getRecruitmentFunnel = async (companyId) => {
  return Candidate.aggregate([
    {
      $match: {
        companyId,
      },
    },
    {
      $group: {
        _id: "$status",
        total: { $sum: 1 },
      },
    },
    {
      $sort: {
        total: -1,
      },
    },
  ]);
};

export const getInterviewsToday = async (companyId) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return Interview.find({
    companyId,
    scheduledDate: {
      $gte: start,
      $lte: end,
    },
  })
    .populate("candidateId", "fullName candidateCode mobile")
    .populate("jobOpeningId", "jobTitle jobCode")
    .sort({ scheduledDate: 1 })
    .lean();
};