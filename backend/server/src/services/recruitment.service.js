import { ApiError } from "../utils/apiError.js";
import {
  ROLES,
  ROLE_PERMISSIONS,
  USER_STATUS,
} from "../constants/roles.js";

import { Company } from "../models/Company.js";
import { Branch } from "../models/Branch.js";
import { Department } from "../models/Department.js";
import { Designation } from "../models/Designation.js";

import { CANDIDATE_STATUS } from "../models/Candidate.js";
import { INTERVIEW_STATUS } from "../models/Interview.js";
import { OFFER_STATUS } from "../models/OfferLetter.js";
import { EMPLOYMENT_TYPE, EMPLOYEE_STATUS } from "../models/Employee.js";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../config/env.js";
import {
  createUserRecord,
  deleteUserById,
  findUserByEmail,
} from "../repositories/user.repository.js";

import {
  createEmployeeRecord,
  findEmployeeById,
  findEmployeeByCode,
  findLastEmployeeByCompany,
} from "../repositories/employee.repository.js";

import {
  findShiftById,
  findShiftByCode,
  findAttendancePolicyById,
  findAttendancePolicyByCode,
} from "../repositories/attendance.repository.js";

import {
  findLeavePolicyById,
  findLeavePolicyByCode,
} from "../repositories/leave.repository.js";

import {
  findSalaryStructureById,
  findSalaryStructureByCode,
} from "../repositories/payroll.repository.js";

import {
  createJobOpeningRecord,
  findJobOpeningById,
  findJobOpeningByCode,
  findLastJobOpeningByCompany,
  updateJobOpeningById,
  deleteJobOpeningById,
  listJobOpenings,

  createCandidateRecord,
  findCandidateById,
  findCandidateByCode,
  findCandidateByEmail,
  findCandidateByMobile,
  findLastCandidateByCompany,
  updateCandidateById,
  deleteCandidateById,
  listCandidates,

  createInterviewRecord,
  findInterviewById,
  updateInterviewById,
  deleteInterviewById,
  listInterviews,

  createOfferRecord,
  findOfferById,
  findOfferByCandidate,
  findOfferByNumber,
  findLastOfferByCompany,
  updateOfferById,
  listOffers,
  deleteOfferById,

  countJobOpenings,
  countCandidates,
  getRecruitmentFunnel,
  getInterviewsToday,
} from "../repositories/recruitment.repository.js";

import { sendWelcomeEmployeeEmail } from "./email.service.js";

const isMongoId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const normalizeCode = (value) => {
  if (!hasValue(value)) return null;
  return String(value).trim().toUpperCase();
};

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const ensureRecruitmentAccess = (currentUser) => {
  if (![ROLES.COMPANY_ADMIN, ROLES.HR].includes(currentUser.role)) {
    throw new ApiError(403, "You are not allowed to manage recruitment.");
  }
};

const ensureSameCompanyRecord = (companyId, record, message = "Record not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }
};

const getCompanyCode = async (companyId) => {
  const company = await Company.findById(companyId).select("companyCode");

  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  return company.companyCode;
};

const generateJobCode = async (companyId) => {
  const companyCode = await getCompanyCode(companyId);
  const lastJob = await findLastJobOpeningByCompany(companyId);

  if (!lastJob?.jobCode) {
    return `${companyCode}-JOB-000001`;
  }

  const lastNumber = Number(lastJob.jobCode.split("-").pop()) || 0;
  return `${companyCode}-JOB-${String(lastNumber + 1).padStart(6, "0")}`;
};

const generateCandidateCode = async (companyId) => {
  const companyCode = await getCompanyCode(companyId);
  const lastCandidate = await findLastCandidateByCompany(companyId);

  if (!lastCandidate?.candidateCode) {
    return `${companyCode}-CAN-000001`;
  }

  const lastNumber = Number(lastCandidate.candidateCode.split("-").pop()) || 0;
  return `${companyCode}-CAN-${String(lastNumber + 1).padStart(6, "0")}`;
};

const generateOfferNumber = async (companyId) => {
  const companyCode = await getCompanyCode(companyId);
  const lastOffer = await findLastOfferByCompany(companyId);

  if (!lastOffer?.offerNumber) {
    return `${companyCode}-OFFER-000001`;
  }

  const lastNumber = Number(lastOffer.offerNumber.split("-").pop()) || 0;
  return `${companyCode}-OFFER-${String(lastNumber + 1).padStart(6, "0")}`;
};

const generateEmployeeCode = async (companyId) => {
  const companyCode = await getCompanyCode(companyId);
  const lastEmployee = await findLastEmployeeByCompany(companyId);

  if (!lastEmployee?.employeeCode) {
    return `${companyCode}-EMP-000001`;
  }

  const lastNumber = Number(lastEmployee.employeeCode.split("-").pop()) || 0;
  return `${companyCode}-EMP-${String(lastNumber + 1).padStart(6, "0")}`;
};

const generateTempPassword = () => {
  return `Temp@${crypto.randomBytes(4).toString("hex")}`;
};

/* ================= COMMON RESOLVERS ================= */

const resolveBranch = async (companyId, payload = {}) => {
  const branchId = payload.branchId;
  const branchCode = normalizeCode(payload.branchCode);

  if (!hasValue(branchId) && !branchCode) return null;

  let branch = null;

  if (hasValue(branchId)) {
    branch = await Branch.findById(branchId);
  }

  if (!branch && branchCode) {
    branch = await Branch.findOne({ companyId, branchCode });
  }

  ensureSameCompanyRecord(companyId, branch, "Branch not found.");
  return branch;
};

const resolveDepartment = async (companyId, payload = {}) => {
  const departmentId = payload.departmentId;
  const departmentCode = normalizeCode(payload.departmentCode);

  if (!hasValue(departmentId) && !departmentCode) return null;

  let department = null;

  if (hasValue(departmentId)) {
    department = await Department.findById(departmentId);
  }

  if (!department && departmentCode) {
    department = await Department.findOne({ companyId, departmentCode });
  }

  ensureSameCompanyRecord(companyId, department, "Department not found.");
  return department;
};

const resolveDesignation = async (companyId, payload = {}) => {
  const designationId = payload.designationId;
  const designationCode = normalizeCode(payload.designationCode);

  if (!hasValue(designationId) && !designationCode) return null;

  let designation = null;

  if (hasValue(designationId)) {
    designation = await Designation.findById(designationId);
  }

  if (!designation && designationCode) {
    designation = await Designation.findOne({ companyId, designationCode });
  }

  ensureSameCompanyRecord(companyId, designation, "Designation not found.");
  return designation;
};

const resolveEmployee = async (companyId, payloadOrCode, message = "Employee not found.") => {
  let employeeId = null;
  let employeeCode = null;

  if (typeof payloadOrCode === "string") {
    if (isMongoId(payloadOrCode)) {
      employeeId = payloadOrCode;
    } else {
      employeeCode = payloadOrCode;
    }
  } else {
    employeeId =
      payloadOrCode.employeeId ||
      payloadOrCode.hiringManagerId ||
      payloadOrCode.referredBy ||
      payloadOrCode.recruiterId ||
      payloadOrCode.reportingManagerId ||
      payloadOrCode.interviewerId;

    employeeCode =
      payloadOrCode.employeeCode ||
      payloadOrCode.hiringManagerCode ||
      payloadOrCode.hiringManagerEmployeeCode ||
      payloadOrCode.referredByEmployeeCode ||
      payloadOrCode.recruiterCode ||
      payloadOrCode.recruiterEmployeeCode ||
      payloadOrCode.reportingManagerCode ||
      payloadOrCode.reportingManagerEmployeeCode ||
      payloadOrCode.interviewerEmployeeCode;
  }

  if (!hasValue(employeeId) && !hasValue(employeeCode)) return null;

  let employee = null;

  if (hasValue(employeeId)) {
    employee = await findEmployeeById(employeeId);
  }

  if (!employee && hasValue(employeeCode)) {
    employee = await findEmployeeByCode(companyId, normalizeCode(employeeCode));
  }

  ensureSameCompanyRecord(companyId, employee, message);
  return employee;
};

const resolveJobOpening = async (companyId, payloadOrRef, required = true) => {
  let jobId = null;
  let jobCode = null;

  if (typeof payloadOrRef === "string") {
    if (isMongoId(payloadOrRef)) {
      jobId = payloadOrRef;
    } else {
      jobCode = payloadOrRef;
    }
  } else {
    jobId = payloadOrRef.appliedJobId || payloadOrRef.jobOpeningId;
    jobCode = payloadOrRef.jobCode;
  }

  if (!hasValue(jobId) && !hasValue(jobCode)) {
    if (required) throw new ApiError(400, "Job opening is required.");
    return null;
  }

  let job = null;

  if (hasValue(jobId)) {
    job = await findJobOpeningById(jobId);
  }

  if (!job && hasValue(jobCode)) {
    job = await findJobOpeningByCode(companyId, normalizeCode(jobCode));
  }

  ensureSameCompanyRecord(companyId, job, "Job opening not found.");
  return job;
};

const resolveCandidate = async (companyId, payloadOrRef, required = true) => {
  let candidateId = null;
  let candidateCode = null;

  if (typeof payloadOrRef === "string") {
    if (isMongoId(payloadOrRef)) {
      candidateId = payloadOrRef;
    } else {
      candidateCode = payloadOrRef;
    }
  } else {
    candidateId = payloadOrRef.candidateId;
    candidateCode = payloadOrRef.candidateCode;
  }

  if (!hasValue(candidateId) && !hasValue(candidateCode)) {
    if (required) throw new ApiError(400, "Candidate is required.");
    return null;
  }

  let candidate = null;

  if (hasValue(candidateId)) {
    candidate = await findCandidateById(candidateId);
  }

  if (!candidate && hasValue(candidateCode)) {
    candidate = await findCandidateByCode(companyId, normalizeCode(candidateCode));
  }

  ensureSameCompanyRecord(companyId, candidate, "Candidate not found.");
  return candidate;
};

const resolveOffer = async (companyId, idOrNumber) => {
  let offer = null;

  if (isMongoId(idOrNumber)) {
    offer = await findOfferById(idOrNumber);
  }

  if (!offer) {
    offer = await findOfferByNumber(companyId, normalizeCode(idOrNumber));
  }

  ensureSameCompanyRecord(companyId, offer, "Offer not found.");
  return offer;
};

const resolveShift = async (companyId, payload = {}) => {
  if (!hasValue(payload.shiftId) && !hasValue(payload.shiftCode)) return null;

  let shift = null;

  if (hasValue(payload.shiftId)) {
    shift = await findShiftById(payload.shiftId);
  }

  if (!shift && hasValue(payload.shiftCode)) {
    shift = await findShiftByCode(companyId, normalizeCode(payload.shiftCode));
  }

  ensureSameCompanyRecord(companyId, shift, "Shift not found.");
  return shift;
};

const resolveLeavePolicy = async (companyId, payload = {}) => {
  const policyCode =
    payload.leavePolicyCode || payload.policyCode || payload.leavePolicyCodeValue;

  if (!hasValue(payload.leavePolicyId) && !hasValue(policyCode)) return null;

  let policy = null;

  if (hasValue(payload.leavePolicyId)) {
    policy = await findLeavePolicyById(payload.leavePolicyId);
  }

  if (!policy && hasValue(policyCode)) {
    policy = await findLeavePolicyByCode(companyId, normalizeCode(policyCode));
  }

  ensureSameCompanyRecord(companyId, policy, "Leave policy not found.");
  return policy;
};

const resolveAttendancePolicy = async (companyId, payload = {}) => {
  const policyCode = payload.attendancePolicyCode || payload.policyCode;

  if (!hasValue(payload.attendancePolicyId) && !hasValue(policyCode)) return null;

  let policy = null;

  if (hasValue(payload.attendancePolicyId)) {
    policy = await findAttendancePolicyById(payload.attendancePolicyId);
  }

  if (!policy && hasValue(policyCode)) {
    policy = await findAttendancePolicyByCode(companyId, normalizeCode(policyCode));
  }

  ensureSameCompanyRecord(companyId, policy, "Attendance policy not found.");
  return policy;
};

const resolveSalaryStructure = async (companyId, payload = {}) => {
  const structureCode = payload.salaryStructureCode || payload.structureCode;

  if (!hasValue(payload.salaryStructureId) && !hasValue(structureCode)) return null;

  let structure = null;

  if (hasValue(payload.salaryStructureId)) {
    structure = await findSalaryStructureById(payload.salaryStructureId);
  }

  if (!structure && hasValue(structureCode)) {
    structure = await findSalaryStructureByCode(companyId, normalizeCode(structureCode));
  }

  ensureSameCompanyRecord(companyId, structure, "Salary structure not found.");
  return structure;
};

const removeCodeFields = (payload) => {
  delete payload.branchCode;
  delete payload.departmentCode;
  delete payload.designationCode;
  delete payload.hiringManagerCode;
  delete payload.hiringManagerEmployeeCode;
  delete payload.jobCode;
  delete payload.candidateCode;
  delete payload.referredByEmployeeCode;
  delete payload.recruiterCode;
  delete payload.recruiterEmployeeCode;
  delete payload.employeeCode;
  delete payload.reportingManagerCode;
  delete payload.reportingManagerEmployeeCode;
  delete payload.shiftCode;
  delete payload.leavePolicyCode;
  delete payload.leavePolicyCodeValue;
  delete payload.attendancePolicyCode;
  delete payload.salaryStructureCode;
  delete payload.structureCode;
  delete payload.policyCode;
  delete payload.appliedJobIdAlias;
};

/* ================= NORMALIZERS ================= */

const normalizeJobPayload = async (companyId, payload) => {
  const normalized = { ...payload };

  if ("branchId" in payload || "branchCode" in payload) {
    const branch = await resolveBranch(companyId, payload);
    normalized.branchId = branch?._id || null;
  }

  if ("departmentId" in payload || "departmentCode" in payload) {
    const department = await resolveDepartment(companyId, payload);
    normalized.departmentId = department?._id || null;
  }

  if ("designationId" in payload || "designationCode" in payload) {
    const designation = await resolveDesignation(companyId, payload);
    normalized.designationId = designation?._id || null;
  }

  if (
    "hiringManagerId" in payload ||
    "hiringManagerCode" in payload ||
    "hiringManagerEmployeeCode" in payload
  ) {
    const manager = await resolveEmployee(
      companyId,
      {
        employeeId: payload.hiringManagerId,
        employeeCode: payload.hiringManagerCode || payload.hiringManagerEmployeeCode,
      },
      "Hiring manager not found."
    );

    normalized.hiringManagerId = manager?._id || null;
  }

  removeCodeFields(normalized);
  return normalized;
};

const normalizeCandidatePayload = async (
  companyId,
  payload,
  existingCandidate = null,
  requireJob = false
) => {
  const normalized = { ...payload };

  const hasJobInput =
    hasValue(payload.appliedJobId) ||
    hasValue(payload.jobOpeningId) ||
    hasValue(payload.jobCode);

  if (requireJob || hasJobInput) {
    const job = await resolveJobOpening(
      companyId,
      {
        appliedJobId:
          payload.appliedJobId ||
          payload.jobOpeningId ||
          existingCandidate?.appliedJobId,
        jobCode: payload.jobCode,
      },
      true
    );

    normalized.appliedJobId = job._id;
  }

  if ("referredBy" in payload || "referredByEmployeeCode" in payload) {
    const referredBy = await resolveEmployee(
      companyId,
      {
        employeeId: payload.referredBy,
        employeeCode: payload.referredByEmployeeCode,
      },
      "Referral employee not found."
    );

    normalized.referredBy = referredBy?._id || null;
  }

  if (
    "recruiterId" in payload ||
    "recruiterCode" in payload ||
    "recruiterEmployeeCode" in payload
  ) {
    const recruiter = await resolveEmployee(
      companyId,
      {
        employeeId: payload.recruiterId,
        employeeCode: payload.recruiterCode || payload.recruiterEmployeeCode,
      },
      "Recruiter not found."
    );

    normalized.recruiterId = recruiter?._id || null;
  }

  delete normalized.jobOpeningId;
  removeCodeFields(normalized);

  return normalized;
};

const normalizePanelMembers = async (companyId, panelMembers = []) => {
  const normalized = [];

  for (const member of panelMembers) {
    const item = { ...member };

    if (hasValue(member.employeeId) || hasValue(member.employeeCode)) {
      const employee = await resolveEmployee(
        companyId,
        {
          employeeId: member.employeeId,
          employeeCode: member.employeeCode,
        },
        "Panel member not found."
      );

      item.employeeId = employee._id;

      if (!item.name) item.name = employee.displayName;
      if (!item.email) item.email = employee.officialEmail || employee.personalEmail || "";
    }

    delete item.employeeCode;

    normalized.push(item);
  }

  return normalized;
};

const normalizeFeedback = async (companyId, feedback = []) => {
  const normalized = [];

  for (const item of feedback) {
    const row = { ...item };

    const interviewerCode = item.interviewerEmployeeCode || item.employeeCode;

    if (hasValue(item.interviewerId) || hasValue(interviewerCode)) {
      const employee = await resolveEmployee(
        companyId,
        {
          employeeId: item.interviewerId,
          employeeCode: interviewerCode,
        },
        "Feedback interviewer not found."
      );

      row.interviewerId = employee._id;
    }

    delete row.interviewerEmployeeCode;
    delete row.employeeCode;

    normalized.push(row);
  }

  return normalized;
};

const normalizeInterviewPayload = async (
  companyId,
  payload,
  existingInterview = null,
  requireRefs = false
) => {
  const normalized = { ...payload };

  const hasCandidateInput =
    hasValue(payload.candidateId) || hasValue(payload.candidateCode);

  const hasJobInput =
    hasValue(payload.jobOpeningId) ||
    hasValue(payload.appliedJobId) ||
    hasValue(payload.jobCode);

  let candidate = null;
  let job = null;

  if (requireRefs || hasCandidateInput) {
    candidate = await resolveCandidate(
      companyId,
      {
        candidateId: payload.candidateId || existingInterview?.candidateId,
        candidateCode: payload.candidateCode,
      },
      true
    );

    normalized.candidateId = candidate._id;
  } else if (existingInterview?.candidateId) {
    candidate = await findCandidateById(existingInterview.candidateId);
  }

  if (requireRefs || hasJobInput) {
    job = await resolveJobOpening(
      companyId,
      {
        appliedJobId:
          payload.jobOpeningId ||
          payload.appliedJobId ||
          existingInterview?.jobOpeningId,
        jobCode: payload.jobCode,
      },
      true
    );

    normalized.jobOpeningId = job._id;
  } else if (existingInterview?.jobOpeningId) {
    job = await findJobOpeningById(existingInterview.jobOpeningId);
  }

  if (candidate && job && candidate.appliedJobId.toString() !== job._id.toString()) {
    throw new ApiError(400, "Candidate does not belong to this job opening.");
  }

  if (payload.panelMembers) {
    normalized.panelMembers = await normalizePanelMembers(
      companyId,
      payload.panelMembers
    );
  }

  if (payload.feedback) {
    normalized.feedback = await normalizeFeedback(companyId, payload.feedback);
  }

  delete normalized.candidateCode;
  delete normalized.appliedJobId;
  delete normalized.jobCode;

  return normalized;
};

const normalizeOfferPayload = async (
  companyId,
  payload,
  existingOffer = null,
  requireRefs = false
) => {
  const normalized = { ...payload };

  const hasCandidateInput =
    hasValue(payload.candidateId) || hasValue(payload.candidateCode);

  const hasJobInput =
    hasValue(payload.jobOpeningId) ||
    hasValue(payload.appliedJobId) ||
    hasValue(payload.jobCode);

  let candidate = null;
  let job = null;

  if (requireRefs || hasCandidateInput) {
    candidate = await resolveCandidate(
      companyId,
      {
        candidateId: payload.candidateId || existingOffer?.candidateId,
        candidateCode: payload.candidateCode,
      },
      true
    );

    normalized.candidateId = candidate._id;
  } else if (existingOffer?.candidateId) {
    candidate = await findCandidateById(existingOffer.candidateId);
  }

  if (requireRefs || hasJobInput) {
    job = await resolveJobOpening(
      companyId,
      {
        appliedJobId:
          payload.jobOpeningId ||
          payload.appliedJobId ||
          existingOffer?.jobOpeningId,
        jobCode: payload.jobCode,
      },
      true
    );

    normalized.jobOpeningId = job._id;
  } else if (existingOffer?.jobOpeningId) {
    job = await findJobOpeningById(existingOffer.jobOpeningId);
  }

  if (candidate && job && candidate.appliedJobId.toString() !== job._id.toString()) {
    throw new ApiError(400, "Candidate does not belong to this job opening.");
  }

  delete normalized.candidateCode;
  delete normalized.appliedJobId;
  delete normalized.jobCode;

  return {
    payload: normalized,
    candidate,
    job,
  };
};

const normalizeConversionRefs = async (companyId, payload = {}) => {
  const normalized = { ...payload };

  if (
    "reportingManagerId" in payload ||
    "reportingManagerCode" in payload ||
    "reportingManagerEmployeeCode" in payload
  ) {
    const manager = await resolveEmployee(
      companyId,
      {
        employeeId: payload.reportingManagerId,
        employeeCode:
          payload.reportingManagerCode || payload.reportingManagerEmployeeCode,
      },
      "Reporting manager not found."
    );

    normalized.reportingManagerId = manager?._id || null;
  }

  if ("branchId" in payload || "branchCode" in payload) {
    const branch = await resolveBranch(companyId, payload);
    normalized.branchId = branch?._id || null;
  }

  if ("departmentId" in payload || "departmentCode" in payload) {
    const department = await resolveDepartment(companyId, payload);
    normalized.departmentId = department?._id || null;
  }

  if ("designationId" in payload || "designationCode" in payload) {
    const designation = await resolveDesignation(companyId, payload);
    normalized.designationId = designation?._id || null;
  }

  if ("shiftId" in payload || "shiftCode" in payload) {
    const shift = await resolveShift(companyId, payload);
    normalized.shiftId = shift?._id || null;
  }

  if (
    "leavePolicyId" in payload ||
    "leavePolicyCode" in payload ||
    "policyCode" in payload ||
    "leavePolicyCodeValue" in payload
  ) {
    const leavePolicy = await resolveLeavePolicy(companyId, payload);
    normalized.leavePolicyId = leavePolicy?._id || null;
  }

  if ("attendancePolicyId" in payload || "attendancePolicyCode" in payload) {
    const attendancePolicy = await resolveAttendancePolicy(companyId, payload);
    normalized.attendancePolicyId = attendancePolicy?._id || null;
  }

  if (
    "salaryStructureId" in payload ||
    "salaryStructureCode" in payload ||
    "structureCode" in payload
  ) {
    const salaryStructure = await resolveSalaryStructure(companyId, payload);
    normalized.salaryStructureId = salaryStructure?._id || null;
  }

  removeCodeFields(normalized);
  return normalized;
};

/* ================= FILTERS ================= */

const buildJobFilter = async (companyId, query = {}) => {
  const filter = { companyId };

  if (query.status) filter.status = query.status;

  if (query.departmentId) {
    filter.departmentId = query.departmentId;
  }

  if (query.departmentCode) {
    const department = await resolveDepartment(companyId, {
      departmentCode: query.departmentCode,
    });

    filter.departmentId = department._id;
  }

  if (query.designationId) {
    filter.designationId = query.designationId;
  }

  if (query.designationCode) {
    const designation = await resolveDesignation(companyId, {
      designationCode: query.designationCode,
    });

    filter.designationId = designation._id;
  }

  if (query.branchId) {
    filter.branchId = query.branchId;
  }

  if (query.branchCode) {
    const branch = await resolveBranch(companyId, {
      branchCode: query.branchCode,
    });

    filter.branchId = branch._id;
  }

  if (query.jobCode) {
    filter.jobCode = normalizeCode(query.jobCode);
  }

  if (query.search) {
    filter.$or = [
      { jobCode: { $regex: query.search, $options: "i" } },
      { jobTitle: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const buildCandidateFilter = async (companyId, query = {}) => {
  const filter = { companyId };

  if (query.status) filter.status = query.status;

  if (query.appliedJobId) {
    filter.appliedJobId = query.appliedJobId;
  }

  if (query.jobCode) {
    const job = await resolveJobOpening(companyId, query.jobCode);
    filter.appliedJobId = job._id;
  }

  if (query.source) filter.source = query.source;

  if (query.recruiterId) {
    filter.recruiterId = query.recruiterId;
  }

  if (query.recruiterEmployeeCode || query.recruiterCode) {
    const recruiter = await resolveEmployee(
      companyId,
      {
        employeeCode: query.recruiterEmployeeCode || query.recruiterCode,
      },
      "Recruiter not found."
    );

    filter.recruiterId = recruiter._id;
  }

  if (query.candidateCode) {
    filter.candidateCode = normalizeCode(query.candidateCode);
  }

  if (query.search) {
    filter.$or = [
      { candidateCode: { $regex: query.search, $options: "i" } },
      { fullName: { $regex: query.search, $options: "i" } },
      { email: { $regex: query.search, $options: "i" } },
      { mobile: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const buildInterviewFilter = async (companyId, query = {}) => {
  const filter = { companyId };

  if (query.status) filter.status = query.status;
  if (query.result) filter.result = query.result;

  if (query.candidateId) {
    filter.candidateId = query.candidateId;
  }

  if (query.candidateCode) {
    const candidate = await resolveCandidate(companyId, query.candidateCode);
    filter.candidateId = candidate._id;
  }

  if (query.jobOpeningId) {
    filter.jobOpeningId = query.jobOpeningId;
  }

  if (query.jobCode) {
    const job = await resolveJobOpening(companyId, query.jobCode);
    filter.jobOpeningId = job._id;
  }

  return filter;
};

const buildOfferFilter = async (companyId, query = {}) => {
  const filter = { companyId };

  if (query.status) filter.status = query.status;

  if (query.candidateId) {
    filter.candidateId = query.candidateId;
  }

  if (query.candidateCode) {
    const candidate = await resolveCandidate(companyId, query.candidateCode);
    filter.candidateId = candidate._id;
  }

  if (query.jobOpeningId) {
    filter.jobOpeningId = query.jobOpeningId;
  }

  if (query.jobCode) {
    const job = await resolveJobOpening(companyId, query.jobCode);
    filter.jobOpeningId = job._id;
  }

  if (query.offerNumber) {
    filter.offerNumber = normalizeCode(query.offerNumber);
  }

  return filter;
};

/* ================= JOB OPENINGS ================= */

export const createJobOpeningService = async (currentUser, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const normalizedPayload = await normalizeJobPayload(companyId, payload);

  const jobCode = await generateJobCode(companyId);

  const exists = await findJobOpeningByCode(companyId, jobCode);

  if (exists) {
    throw new ApiError(409, "Job code already exists. Please retry.");
  }

  return createJobOpeningRecord({
    ...normalizedPayload,
    companyId,
    jobCode,
    createdBy: currentUser._id,
  });
};

export const getJobOpeningsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = await buildJobFilter(companyId, query);

  return listJobOpenings({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getJobOpeningByIdService = async (currentUser, idOrCode) => {
  const companyId = getCompanyId(currentUser);
  return resolveJobOpening(companyId, idOrCode);
};

export const updateJobOpeningService = async (currentUser, idOrCode, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const job = await resolveJobOpening(companyId, idOrCode);

  const normalizedPayload = await normalizeJobPayload(companyId, payload);

  return updateJobOpeningById(job._id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });
};

export const updateJobStatusService = async (currentUser, idOrCode, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const job = await resolveJobOpening(companyId, idOrCode);

  return updateJobOpeningById(job._id, {
    status: payload.status,
    updatedBy: currentUser._id,
  });
};

export const deleteJobOpeningService = async (currentUser, idOrCode) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const job = await resolveJobOpening(companyId, idOrCode);

  await deleteJobOpeningById(job._id);

  return true;
};

const ensureCandidateNoDuplicates = async (
  companyId,
  payload,
  currentCandidateId = null
) => {
  if (payload.email) {
    const existing = await findCandidateByEmail(companyId, payload.email);
    if (
      existing &&
      (!currentCandidateId ||
        existing._id.toString() !== currentCandidateId.toString())
    ) {
      throw new ApiError(409, "A candidate with this email already exists.");
    }
  }

  if (payload.mobile) {
    const existing = await findCandidateByMobile(companyId, payload.mobile);
    if (
      existing &&
      (!currentCandidateId ||
        existing._id.toString() !== currentCandidateId.toString())
    ) {
      throw new ApiError(409, "A candidate with this mobile already exists.");
    }
  }
};


/* ================= CANDIDATES ================= */

export const createCandidateService = async (currentUser, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const normalizedPayload = await normalizeCandidatePayload(
    companyId,
    payload,
    null,
    true
  );

  await ensureCandidateNoDuplicates(companyId, normalizedPayload);

  const candidateCode = await generateCandidateCode(companyId);

  const exists = await findCandidateByCode(companyId, candidateCode);

  if (exists) {
    throw new ApiError(409, "Candidate code already exists. Please retry.");
  }

  return createCandidateRecord({
    ...normalizedPayload,
    companyId,
    candidateCode,
    createdBy: currentUser._id,
  });
};

export const getCandidatesService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = await buildCandidateFilter(companyId, query);

  return listCandidates({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getCandidateByIdService = async (currentUser, idOrCode) => {
  const companyId = getCompanyId(currentUser);
  return resolveCandidate(companyId, idOrCode);
};

export const updateCandidateService = async (currentUser, idOrCode, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const candidate = await resolveCandidate(companyId, idOrCode);

  const normalizedPayload = await normalizeCandidatePayload(
    companyId,
    payload,
    candidate,
    false
  );

  await ensureCandidateNoDuplicates(companyId, normalizedPayload, candidate._id);

  return updateCandidateById(candidate._id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });
};

export const updateCandidateStatusService = async (
  currentUser,
  idOrCode,
  payload
) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const candidate = await resolveCandidate(companyId, idOrCode);

  return updateCandidateById(candidate._id, {
    status: payload.status,
    remarks: payload.remarks || candidate.remarks,
    updatedBy: currentUser._id,
  });
};

export const deleteCandidateService = async (currentUser, idOrCode) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const candidate = await resolveCandidate(companyId, idOrCode);

  await deleteCandidateById(candidate._id);

  return true;
};

/* ================= INTERVIEWS ================= */

export const createInterviewService = async (currentUser, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const normalizedPayload = await normalizeInterviewPayload(
    companyId,
    payload,
    null,
    true
  );

  const interview = await createInterviewRecord({
    ...normalizedPayload,
    companyId,
    createdBy: currentUser._id,
  });

  await updateCandidateById(normalizedPayload.candidateId, {
    status: CANDIDATE_STATUS.INTERVIEW_SCHEDULED,
    updatedBy: currentUser._id,
  });

  return interview;
};

export const getInterviewsService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = await buildInterviewFilter(companyId, query);

  return listInterviews({
    filter,
    page,
    limit,
    sort: { scheduledDate: -1 },
  });
};

export const getInterviewByIdService = async (currentUser, id) => {
  const companyId = getCompanyId(currentUser);
  const interview = await findInterviewById(id);

  ensureSameCompanyRecord(companyId, interview, "Interview not found.");

  return interview;
};

export const updateInterviewService = async (currentUser, id, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const interview = await findInterviewById(id);

  ensureSameCompanyRecord(companyId, interview, "Interview not found.");

  const normalizedPayload = await normalizeInterviewPayload(
    companyId,
    payload,
    interview,
    false
  );

  return updateInterviewById(interview._id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });
};

export const updateInterviewResultService = async (currentUser, id, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const interview = await findInterviewById(id);

  ensureSameCompanyRecord(companyId, interview, "Interview not found.");

  const normalizedPayload = {
    ...payload,
    feedback: payload.feedback
      ? await normalizeFeedback(companyId, payload.feedback)
      : [],
  };

  const updated = await updateInterviewById(interview._id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });

  if (payload.status === INTERVIEW_STATUS.COMPLETED) {
    await updateCandidateById(interview.candidateId, {
      status:
        payload.result === "pass"
          ? CANDIDATE_STATUS.INTERVIEWED
          : payload.result === "fail"
            ? CANDIDATE_STATUS.REJECTED
            : CANDIDATE_STATUS.ON_HOLD,
      updatedBy: currentUser._id,
    });
  }

  return updated;
};

export const deleteInterviewService = async (currentUser, id) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const interview = await findInterviewById(id);

  ensureSameCompanyRecord(companyId, interview, "Interview not found.");

  await deleteInterviewById(interview._id);

  return true;
};

/* ================= OFFER LETTERS ================= */

export const createOfferService = async (currentUser, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const { payload: normalizedPayload, candidate } = await normalizeOfferPayload(
    companyId,
    payload,
    null,
    true
  );

  const existingOffer = await findOfferByCandidate(companyId, candidate._id);

  if (existingOffer) {
    throw new ApiError(409, "Offer already exists for this candidate.");
  }

  const offerNumber = await generateOfferNumber(companyId);

  const offerExists = await findOfferByNumber(companyId, offerNumber);

  if (offerExists) {
    throw new ApiError(409, "Offer number already exists. Please retry.");
  }

  const offer = await createOfferRecord({
    ...normalizedPayload,
    companyId,
    offerNumber,
    status: OFFER_STATUS.DRAFT,
    createdBy: currentUser._id,
  });

  await updateCandidateById(candidate._id, {
    status: CANDIDATE_STATUS.OFFER_SENT,
    updatedBy: currentUser._id,
  });

  return offer;
};

export const getOffersService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const page = Number(query.page || 1);
  const limit = Math.min(Number(query.limit || 10), 100);

  const filter = await buildOfferFilter(companyId, query);

  return listOffers({
    filter,
    page,
    limit,
    sort: { createdAt: -1 },
  });
};

export const getOfferByIdService = async (currentUser, idOrNumber) => {
  const companyId = getCompanyId(currentUser);
  return resolveOffer(companyId, idOrNumber);
};

export const updateOfferService = async (currentUser, idOrNumber, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const offer = await resolveOffer(companyId, idOrNumber);

  if (offer.status === OFFER_STATUS.ACCEPTED) {
    throw new ApiError(400, "Accepted offer cannot be edited.");
  }

  const { payload: normalizedPayload } = await normalizeOfferPayload(
    companyId,
    payload,
    offer,
    false
  );

  return updateOfferById(offer._id, {
    ...normalizedPayload,
    updatedBy: currentUser._id,
  });
};

export const updateOfferStatusService = async (currentUser, idOrNumber, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const offer = await resolveOffer(companyId, idOrNumber);

  const updatePayload = {
    status: payload.status,
    remarks: payload.remarks || offer.remarks,
    updatedBy: currentUser._id,
  };

  if (payload.status === OFFER_STATUS.ACCEPTED) {
    updatePayload.acceptedAt = new Date();
  }

  if (payload.status === OFFER_STATUS.REJECTED) {
    updatePayload.rejectedAt = new Date();
  }

  const updated = await updateOfferById(offer._id, updatePayload);

  if (payload.status === OFFER_STATUS.ACCEPTED) {
    await updateCandidateById(offer.candidateId, {
      status: CANDIDATE_STATUS.OFFER_ACCEPTED,
      updatedBy: currentUser._id,
    });
  }

  return updated;
};

export const acceptOfferService = async (currentUser, candidateRef, payload) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const candidate = await resolveCandidate(companyId, candidateRef);

  const offer = await findOfferByCandidate(companyId, candidate._id);

  if (!offer) {
    throw new ApiError(404, "Offer not found for this candidate.");
  }

  const updated = await updateOfferById(offer._id, {
    status: OFFER_STATUS.ACCEPTED,
    joiningDate: payload.joiningDate,
    acceptedAt: new Date(),
    updatedBy: currentUser._id,
  });

  await updateCandidateById(candidate._id, {
    status: CANDIDATE_STATUS.OFFER_ACCEPTED,
    updatedBy: currentUser._id,
  });

  return updated;
};

export const deleteOfferService = async (currentUser, idOrNumber) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);
  const offer = await resolveOffer(companyId, idOrNumber);

  if (offer.status === OFFER_STATUS.ACCEPTED) {
    throw new ApiError(400, "Accepted offer cannot be deleted.");
  }

  await deleteOfferById(offer._id);

  return true;
};

/* ================= CANDIDATE CONVERSION ================= */

export const getCandidateConversionPreviewService = async (
  currentUser,
  candidateRef
) => {
  const companyId = getCompanyId(currentUser);

  const candidate = await resolveCandidate(companyId, candidateRef);

  const offer = await findOfferByCandidate(companyId, candidate._id);

  if (!offer) {
    throw new ApiError(404, "Offer not found.");
  }

  return {
    candidate,
    offer,
    canConvert: candidate.status === CANDIDATE_STATUS.OFFER_ACCEPTED,
  };
};

export const convertCandidateToEmployeeService = async (
  currentUser,
  candidateRef,
  payload
) => {
  ensureRecruitmentAccess(currentUser);

  const companyId = getCompanyId(currentUser);

  const candidate = await resolveCandidate(companyId, candidateRef);

  if (candidate.employeeId) {
    throw new ApiError(409, "Candidate already converted to employee.");
  }

  if (candidate.status !== CANDIDATE_STATUS.OFFER_ACCEPTED) {
    throw new ApiError(400, "Only offer accepted candidates can be converted.");
  }

  const offer = await findOfferByCandidate(companyId, candidate._id);

  if (!offer || offer.status !== OFFER_STATUS.ACCEPTED) {
    throw new ApiError(400, "Accepted offer is required before conversion.");
  }

  const job = await resolveJobOpening(companyId, candidate.appliedJobId);

  const normalizedPayload = await normalizeConversionRefs(companyId, payload);

  const email =
    candidate.email ||
    `${candidate.candidateCode.toLowerCase()}@noemail.local`;

  const existingUser = await findUserByEmail(email.toLowerCase());

  if (existingUser) {
    throw new ApiError(409, "User email already exists.");
  }

  const employeeCode = await generateEmployeeCode(companyId);
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);

  const user = await createUserRecord({
    companyId,
    isPlatformUser: false,
    name: candidate.fullName || `${candidate.firstName} ${candidate.lastName}`,
    email: email.toLowerCase(),
    mobile: candidate.mobile,
    passwordHash,
    role: ROLES.EMPLOYEE,
    permissions: ROLE_PERMISSIONS[ROLES.EMPLOYEE] || [],
    status: USER_STATUS.ACTIVE,
  
    // This employee is created by HR after accepted offer.
    // Welcome email includes temp password, so do not block login by verification.
    isEmailVerified: true,
  
    forcePasswordChange: true,
    createdBy: currentUser._id,
  });

  let employee;

  try {
    employee = await createEmployeeRecord({
      companyId,
      userId: user._id,
      employeeCode,

      firstName: candidate.firstName,
      middleName: candidate.middleName || "",
      lastName: candidate.lastName,
      employeePhoto: candidate.photo || "",

      gender: candidate.gender,
      dateOfBirth: candidate.dateOfBirth || null,

      officialEmail: candidate.email || "",
      personalEmail: candidate.email || "",
      mobile: candidate.mobile,
      alternateMobile: candidate.alternateMobile || "",

      currentAddress: candidate.currentAddress || {},
      permanentAddress: candidate.permanentAddress || {},

      branchId: normalizedPayload.branchId || job.branchId || null,
      departmentId: normalizedPayload.departmentId || job.departmentId || null,
      designationId: normalizedPayload.designationId || job.designationId || null,
      reportingManagerId:
        normalizedPayload.reportingManagerId || job.hiringManagerId || null,

      employmentType: job.employmentType || EMPLOYMENT_TYPE.PERMANENT,
      workMode: normalizedPayload.workMode || job.workMode || "office",
      workLocation: normalizedPayload.workLocation || job.location || "",

      shiftId: normalizedPayload.shiftId || null,

      joiningDate: offer.joiningDate,

      noticePeriodDays: offer.noticePeriodDays || 30,

      employeeStatus: EMPLOYEE_STATUS.ACTIVE,

      salaryStructureId: normalizedPayload.salaryStructureId || null,
      attendancePolicyId: normalizedPayload.attendancePolicyId || null,
      leavePolicyId: normalizedPayload.leavePolicyId || null,

      notes: `Converted from candidate ${candidate.candidateCode}`,

      createdBy: currentUser._id,
    });
  } catch (error) {
    await deleteUserById(user._id);
    throw error;
  }

  user.employee = employee._id;
  await user.save();

  await updateCandidateById(candidate._id, {
    status: CANDIDATE_STATUS.JOINED,
    employeeId: employee._id,
    joinedOn: new Date(),
    updatedBy: currentUser._id,
  });

  if (
    payload.sendWelcomeEmail !== false &&
    candidate.email &&
    !email.endsWith("@noemail.local")
  ) {
    try {
      await sendWelcomeEmployeeEmail({
        to: user.email,
        name: user.name,
        employeeCode: employee.employeeCode,
        temporaryPassword: tempPassword,
        loginUrl: `${env.CLIENT_ORIGIN}/login`,
      });
    } catch (emailError) {
      console.error(
        "[convertCandidateToEmployee] Welcome email failed:",
        emailError.message
      );
    }
  }

  return {
    employee,
    user: user.toSafeObject(),
    temporaryPassword: tempPassword,
  };
};

/* ================= DASHBOARD ================= */

export const getRecruitmentDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [
    openJobs,
    totalCandidates,
    shortlistedCandidates,
    selectedCandidates,
    interviewsToday,
    funnel,
  ] = await Promise.all([
    countJobOpenings({ companyId, status: "open" }),
    countCandidates({ companyId }),
    countCandidates({ companyId, status: "shortlisted" }),
    countCandidates({ companyId, status: "selected" }),
    getInterviewsToday(companyId),
    getRecruitmentFunnel(companyId),
  ]);

  return {
    openJobs,
    totalCandidates,
    shortlistedCandidates,
    selectedCandidates,
    interviewsToday,
    funnel,
  };
};