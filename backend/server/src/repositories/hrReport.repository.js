import { Employee } from "../models/Employee.js";
import { withVisibleEmployeeFilter } from "./employee.repository.js";
import { Attendance } from "../models/Attendance.js";
import { LeaveRequest } from "../models/LeaveRequest.js";
import { JobOpening } from "../models/JobOpening.js";
import { Candidate } from "../models/Candidate.js";
import { PayrollRun } from "../models/PayrollRun.js";
import { Payslip } from "../models/Payslip.js";
import { Holiday } from "../models/Holiday.js";
import { HREvent } from "../models/HREvent.js";
import { HRMeeting } from "../models/HRMeeting.js";

export const employeeReport = async (filter) => {
  return Employee.find(await withVisibleEmployeeFilter(filter))
    .populate("branchId", "branchName branchCode")
    .populate("departmentId", "departmentName departmentCode")
    .populate("designationId", "designationName designationCode")
    .populate("reportingManagerId", "displayName employeeCode")
    .sort({ createdAt: -1 })
    .lean();
};

export const attendanceReport = async (filter) => {
  return Attendance.find(filter)
    .populate("employeeId", "displayName employeeCode")
    .populate("shiftId", "shiftName shiftCode")
    .sort({ attendanceDate: -1 })
    .lean();
};

export const leaveReport = async (filter) => {
  return LeaveRequest.find(filter)
    .populate("employeeId", "displayName employeeCode")
    .populate("leaveTypeId", "leaveName leaveCode category")
    .populate("leavePolicyId", "policyName policyCode")
    .sort({ createdAt: -1 })
    .lean();
};

export const recruitmentReport = async (filter) => {
  return Candidate.find(filter)
    .populate("appliedJobId", "jobTitle jobCode status")
    .populate("recruiterId", "displayName employeeCode")
    .sort({ createdAt: -1 })
    .lean();
};

export const jobOpeningReport = async (filter) => {
  return JobOpening.find(filter)
    .populate("branchId", "branchName branchCode")
    .populate("departmentId", "departmentName departmentCode")
    .populate("designationId", "designationName designationCode")
    .populate("hiringManagerId", "displayName employeeCode")
    .sort({ createdAt: -1 })
    .lean();
};

export const payrollReport = async (filter) => {
  return PayrollRun.find(filter)
    .sort({ year: -1, month: -1 })
    .lean();
};

export const payslipReport = async (filter) => {
  return Payslip.find(filter)
    .populate("employeeId", "displayName employeeCode")
    .populate("payrollRunId", "payrollCode month year status")
    .sort({ year: -1, month: -1 })
    .lean();
};

export const holidayReport = async (filter) => {
  return Holiday.find(filter)
    .populate("branchId", "branchName branchCode")
    .sort({ date: 1 })
    .lean();
};

export const eventReport = async (filter) => {
  return HREvent.find(filter)
    .populate("participants.employeeId", "displayName employeeCode")
    .sort({ startDateTime: 1 })
    .lean();
};

export const meetingReport = async (filter) => {
  return HRMeeting.find(filter)
    .populate("organizerId", "displayName employeeCode")
    .populate("attendees.employeeId", "displayName employeeCode")
    .populate("actionItems.assignedTo", "displayName employeeCode")
    .sort({ startDateTime: 1 })
    .lean();
};

