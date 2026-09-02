import { ApiError } from "../utils/apiError.js";

import {
  employeeReport,
  attendanceReport,
  leaveReport,
  recruitmentReport,
  jobOpeningReport,
  payrollReport,
  payslipReport,
  holidayReport,
  eventReport,
  meetingReport,
} from "../repositories/hrReport.repository.js";

import {
  findEmployeeByCode,
  findBranchByCode,
  findDepartmentByCode,
  findDesignationByCode,
} from "../repositories/employee.repository.js";

import { findLeaveTypeByCode } from "../repositories/leave.repository.js";
import { findJobOpeningByCode } from "../repositories/recruitment.repository.js";
import { findPayrollRunByCode } from "../repositories/payroll.repository.js";
import { findEventByCode } from "../repositories/event.repository.js";
import { findMeetingByCode } from "../repositories/meeting.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

const normalizeCode = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim().toUpperCase();
};

const dateRangeFilter = (field, query = {}) => {
  if (!query.from && !query.to) return {};

  const range = {};

  if (query.from) {
    const from = new Date(query.from);
    from.setHours(0, 0, 0, 0);
    range.$gte = from;
  }

  if (query.to) {
    const to = new Date(query.to);
    to.setHours(23, 59, 59, 999);
    range.$lte = to;
  }

  return { [field]: range };
};

const ensureSameCompany = (companyId, record, message = "Record not found.") => {
  if (!record || record.companyId.toString() !== companyId.toString()) {
    throw new ApiError(404, message);
  }

  return record;
};

const resolveEmployeeCode = async (companyId, employeeCode) => {
  const code = normalizeCode(employeeCode);
  if (!code) return null;

  const employee = await findEmployeeByCode(companyId, code);
  return ensureSameCompany(companyId, employee, "Employee not found.");
};

const resolveBranchCode = async (companyId, branchCode) => {
  const code = normalizeCode(branchCode);
  if (!code) return null;

  const branch = await findBranchByCode(companyId, code);
  return ensureSameCompany(companyId, branch, "Branch not found.");
};

const resolveDepartmentCode = async (companyId, departmentCode) => {
  const code = normalizeCode(departmentCode);
  if (!code) return null;

  const department = await findDepartmentByCode(companyId, code);
  return ensureSameCompany(companyId, department, "Department not found.");
};

const resolveDesignationCode = async (companyId, designationCode) => {
  const code = normalizeCode(designationCode);
  if (!code) return null;

  const designation = await findDesignationByCode(companyId, code);
  return ensureSameCompany(companyId, designation, "Designation not found.");
};

const resolveLeaveTypeCode = async (companyId, leaveCode) => {
  const code = normalizeCode(leaveCode);
  if (!code) return null;

  const leaveType = await findLeaveTypeByCode(companyId, code);
  return ensureSameCompany(companyId, leaveType, "Leave type not found.");
};

const resolveJobCode = async (companyId, jobCode) => {
  const code = normalizeCode(jobCode);
  if (!code) return null;

  const job = await findJobOpeningByCode(companyId, code);
  return ensureSameCompany(companyId, job, "Job opening not found.");
};

const resolvePayrollCode = async (companyId, payrollCode) => {
  const code = normalizeCode(payrollCode);
  if (!code) return null;

  const payrollRun = await findPayrollRunByCode(companyId, code);
  return ensureSameCompany(companyId, payrollRun, "Payroll run not found.");
};

const resolveEventCode = async (companyId, eventCode) => {
  const code = normalizeCode(eventCode);
  if (!code) return null;

  const event = await findEventByCode(companyId, code);
  return ensureSameCompany(companyId, event, "HR event not found.");
};

const resolveMeetingCode = async (companyId, meetingCode) => {
  const code = normalizeCode(meetingCode);
  if (!code) return null;

  const meeting = await findMeetingByCode(companyId, code);
  return ensureSameCompany(companyId, meeting, "Meeting not found.");
};

export const getEmployeeReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.employeeCode) {
    const employee = await resolveEmployeeCode(companyId, query.employeeCode);
    filter._id = employee._id;
  }

  if (query.branchCode) {
    const branch = await resolveBranchCode(companyId, query.branchCode);
    filter.branchId = branch._id;
  }

  if (query.departmentCode) {
    const department = await resolveDepartmentCode(
      companyId,
      query.departmentCode
    );
    filter.departmentId = department._id;
  }

  if (query.designationCode) {
    const designation = await resolveDesignationCode(
      companyId,
      query.designationCode
    );
    filter.designationId = designation._id;
  }

  if (query.employeeStatus) {
    filter.employeeStatus = query.employeeStatus;
  }

  Object.assign(filter, dateRangeFilter("joiningDate", query));

  return employeeReport(filter);
};

export const getAttendanceReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.employeeCode) {
    const employee = await resolveEmployeeCode(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.status) {
    filter.status = query.status;
  }

  Object.assign(filter, dateRangeFilter("attendanceDate", query));

  return attendanceReport(filter);
};

export const getLeaveReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.employeeCode) {
    const employee = await resolveEmployeeCode(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  const leaveCode = query.leaveTypeCode || query.leaveCode;

  if (leaveCode) {
    const leaveType = await resolveLeaveTypeCode(companyId, leaveCode);
    filter.leaveTypeId = leaveType._id;
  }

  if (query.status) {
    filter.status = query.status;
  }

  Object.assign(filter, dateRangeFilter("fromDate", query));

  return leaveReport(filter);
};

export const getRecruitmentReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.jobCode) {
    const job = await resolveJobCode(companyId, query.jobCode);
    filter.appliedJobId = job._id;
  }

  const recruiterEmployeeCode =
    query.recruiterEmployeeCode || query.recruiterCode;

  if (recruiterEmployeeCode) {
    const recruiter = await resolveEmployeeCode(companyId, recruiterEmployeeCode);
    filter.recruiterId = recruiter._id;
  }

  Object.assign(filter, dateRangeFilter("createdAt", query));

  return recruitmentReport(filter);
};

export const getJobOpeningReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.branchCode) {
    const branch = await resolveBranchCode(companyId, query.branchCode);
    filter.branchId = branch._id;
  }

  if (query.departmentCode) {
    const department = await resolveDepartmentCode(
      companyId,
      query.departmentCode
    );
    filter.departmentId = department._id;
  }

  if (query.designationCode) {
    const designation = await resolveDesignationCode(
      companyId,
      query.designationCode
    );
    filter.designationId = designation._id;
  }

  Object.assign(filter, dateRangeFilter("createdAt", query));

  return jobOpeningReport(filter);
};

export const getPayrollReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.month) {
    filter.month = Number(query.month);
  }

  if (query.year) {
    filter.year = Number(query.year);
  }

  if (query.status) {
    filter.status = query.status;
  }

  return payrollReport(filter);
};

export const getPayslipReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.employeeCode) {
    const employee = await resolveEmployeeCode(companyId, query.employeeCode);
    filter.employeeId = employee._id;
  }

  if (query.payrollCode) {
    const payrollRun = await resolvePayrollCode(companyId, query.payrollCode);
    filter.payrollRunId = payrollRun._id;
  }

  if (query.month) {
    filter.month = Number(query.month);
  }

  if (query.year) {
    filter.year = Number(query.year);
  }

  if (query.status) {
    filter.status = query.status;
  }

  return payslipReport(filter);
};

export const getHolidayReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.branchCode) {
    const branch = await resolveBranchCode(companyId, query.branchCode);
    filter.branchId = branch._id;
  }

  if (query.type) {
    filter.type = query.type;
  }

  Object.assign(filter, dateRangeFilter("date", query));

  return holidayReport(filter);
};

export const getEventReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.eventCode) {
    const event = await resolveEventCode(companyId, query.eventCode);
    filter._id = event._id;
  }

  if (query.eventType) {
    filter.eventType = query.eventType;
  }

  if (query.status) {
    filter.status = query.status;
  }

  Object.assign(filter, dateRangeFilter("startDateTime", query));

  return eventReport(filter);
};

export const getMeetingReportService = async (currentUser, query = {}) => {
  const companyId = getCompanyId(currentUser);

  const filter = { companyId };

  if (query.meetingCode) {
    const meeting = await resolveMeetingCode(companyId, query.meetingCode);
    filter._id = meeting._id;
  }

  if (query.meetingMode) {
    filter.meetingMode = query.meetingMode;
  }

  if (query.status) {
    filter.status = query.status;
  }

  const organizerEmployeeCode =
    query.organizerEmployeeCode || query.organizerCode;

  if (organizerEmployeeCode) {
    const organizer = await resolveEmployeeCode(
      companyId,
      organizerEmployeeCode
    );
    filter.organizerId = organizer._id;
  }

  Object.assign(filter, dateRangeFilter("startDateTime", query));

  return meetingReport(filter);
};

export const getHRReportSummaryService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [
    employees,
    attendance,
    leave,
    recruitment,
    payroll,
    holidays,
    events,
    meetings,
  ] = await Promise.all([
    employeeReport({ companyId }),
    attendanceReport({ companyId }),
    leaveReport({ companyId }),
    recruitmentReport({ companyId }),
    payrollReport({ companyId }),
    holidayReport({ companyId }),
    eventReport({ companyId }),
    meetingReport({ companyId }),
  ]);

  return {
    employees: employees.length,
    attendance: attendance.length,
    leave: leave.length,
    recruitment: recruitment.length,
    payroll: payroll.length,
    holidays: holidays.length,
    events: events.length,
    meetings: meetings.length,
  };
};