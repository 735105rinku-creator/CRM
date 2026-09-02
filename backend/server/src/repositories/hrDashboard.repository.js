import { Employee } from "../models/Employee.js";
import { countEmployees, employeeUserRoleLookupStages, visibleEmployeeMatchStage } from "./employee.repository.js";
import { Attendance, ATTENDANCE_STATUS } from "../models/Attendance.js";
import { LeaveRequest, LEAVE_REQUEST_STATUS } from "../models/LeaveRequest.js";
import { JobOpening } from "../models/JobOpening.js";
import { Candidate } from "../models/Candidate.js";
import { PayrollRun } from "../models/PayrollRun.js";
import { Payslip } from "../models/Payslip.js";
import { Holiday } from "../models/Holiday.js";
import { HREvent } from "../models/HREvent.js";
import { HRMeeting } from "../models/HRMeeting.js";

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfMonth = (date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (date = new Date()) => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

/* ================= EMPLOYEE ================= */

export const getEmployeeSummary = async (companyId) => {
  const now = new Date();

  const [
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    maleEmployees,
    femaleEmployees,
    otherEmployees,
    newJoinings,
  ] = await Promise.all([
    countEmployees({ companyId }),
    countEmployees({ companyId, isActive: true }),
    countEmployees({ companyId, isActive: false }),
    countEmployees({ companyId, gender: "male" }),
    countEmployees({ companyId, gender: "female" }),
    countEmployees({ companyId, gender: "other" }),
    countEmployees({
      companyId,
      joiningDate: {
        $gte: startOfMonth(now),
        $lte: endOfMonth(now),
      },
    }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
    gender: {
      male: maleEmployees,
      female: femaleEmployees,
      other: otherEmployees,
    },
    newJoinings,
  };
};

export const getUpcomingBirthdays = async (companyId, limit = 10) => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  return Employee.aggregate([
    ...employeeUserRoleLookupStages,
    visibleEmployeeMatchStage(companyId, { isActive: true, dateOfBirth: { $ne: null } }),
    {
      $addFields: {
        birthMonth: { $month: "$dateOfBirth" },
        birthDay: { $dayOfMonth: "$dateOfBirth" },
      },
    },
    {
      $match: {
        $or: [
          { birthMonth: { $gt: currentMonth } },
          {
            birthMonth: currentMonth,
            birthDay: { $gte: currentDay },
          },
        ],
      },
    },
    { $sort: { birthMonth: 1, birthDay: 1 } },
    { $limit: limit },
    {
      $project: {
        employeeCode: 1,
        displayName: 1,
        dateOfBirth: 1,
        birthMonth: 1,
        birthDay: 1,
      },
    },
  ]);
};

export const getUpcomingWorkAnniversaries = async (companyId, limit = 10) => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  return Employee.aggregate([
    ...employeeUserRoleLookupStages,
    visibleEmployeeMatchStage(companyId, { isActive: true, joiningDate: { $ne: null } }),
    {
      $addFields: {
        joinMonth: { $month: "$joiningDate" },
        joinDay: { $dayOfMonth: "$joiningDate" },
      },
    },
    {
      $match: {
        $or: [
          { joinMonth: { $gt: currentMonth } },
          {
            joinMonth: currentMonth,
            joinDay: { $gte: currentDay },
          },
        ],
      },
    },
    { $sort: { joinMonth: 1, joinDay: 1 } },
    { $limit: limit },
    {
      $project: {
        employeeCode: 1,
        displayName: 1,
        joiningDate: 1,
        joinMonth: 1,
        joinDay: 1,
      },
    },
  ]);
};

export const getDepartmentWiseEmployees = async (companyId) => {
  return Employee.aggregate([
    ...employeeUserRoleLookupStages,
    visibleEmployeeMatchStage(companyId, { isActive: true }),
    {
      $group: {
        _id: "$departmentId",
        total: { $sum: 1 },
      },
    },
  ]);
};

export const getBranchWiseEmployees = async (companyId) => {
  return Employee.aggregate([
    ...employeeUserRoleLookupStages,
    visibleEmployeeMatchStage(companyId, { isActive: true }),
    {
      $group: {
        _id: "$branchId",
        total: { $sum: 1 },
      },
    },
  ]);
};

/* ================= ATTENDANCE ================= */

export const getAttendanceSummaryToday = async (companyId) => {
  const today = startOfDay();

  const [present, absent, late, halfDay, onLeave] = await Promise.all([
    Attendance.countDocuments({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.PRESENT,
    }),
    Attendance.countDocuments({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.ABSENT,
    }),
    Attendance.countDocuments({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.LATE,
    }),
    Attendance.countDocuments({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.HALF_DAY,
    }),
    Attendance.countDocuments({
      companyId,
      attendanceDate: today,
      status: ATTENDANCE_STATUS.ON_LEAVE,
    }),
  ]);

  return {
    present,
    absent,
    late,
    halfDay,
    onLeave,
  };
};

/* ================= LEAVE ================= */

export const getLeaveSummary = async (companyId) => {
  const [pending, approved, rejected, cancelled] = await Promise.all([
    LeaveRequest.countDocuments({
      companyId,
      status: LEAVE_REQUEST_STATUS.PENDING,
    }),
    LeaveRequest.countDocuments({
      companyId,
      status: LEAVE_REQUEST_STATUS.APPROVED,
    }),
    LeaveRequest.countDocuments({
      companyId,
      status: LEAVE_REQUEST_STATUS.REJECTED,
    }),
    LeaveRequest.countDocuments({
      companyId,
      status: LEAVE_REQUEST_STATUS.CANCELLED,
    }),
  ]);

  return {
    pending,
    approved,
    rejected,
    cancelled,
  };
};

export const getEmployeesOnLeaveToday = async (companyId) => {
  const today = startOfDay();

  return LeaveRequest.find({
    companyId,
    status: LEAVE_REQUEST_STATUS.APPROVED,
    fromDate: { $lte: today },
    toDate: { $gte: today },
  })
    .populate("employeeId", "displayName employeeCode")
    .populate("leaveTypeId", "leaveName leaveCode colorCode")
    .lean();
};

/* ================= RECRUITMENT ================= */

export const getRecruitmentSummary = async (companyId) => {
  const [openJobs, totalCandidates, interviewsToday] = await Promise.all([
    JobOpening.countDocuments({ companyId, status: "open" }),
    Candidate.countDocuments({ companyId }),
    Candidate.countDocuments({ companyId, status: "interview_scheduled" }),
  ]);

  return {
    openJobs,
    totalCandidates,
    interviewsToday,
  };
};

/* ================= PAYROLL ================= */

export const getPayrollSummary = async (companyId) => {
  const current = new Date();

  const payrollRun = await PayrollRun.findOne({
    companyId,
    month: current.getMonth() + 1,
    year: current.getFullYear(),
  }).lean();

  const payslipsGenerated = await Payslip.countDocuments({
    companyId,
    month: current.getMonth() + 1,
    year: current.getFullYear(),
  });

  return {
    currentMonthPayrollStatus: payrollRun?.status || "not_created",
    payslipsGenerated,
    summary: payrollRun?.summary || {},
  };
};

/* ================= HOLIDAYS ================= */

export const getUpcomingHolidaySummary = async (companyId, limit = 5) => {
  return Holiday.find({
    companyId,
    isActive: true,
    date: { $gte: startOfDay() },
  })
    .sort({ date: 1 })
    .limit(limit)
    .lean();
};

/* ================= EVENTS ================= */

export const getUpcomingEventSummary = async (companyId, limit = 5) => {
  return HREvent.find({
    companyId,
    startDateTime: { $gte: new Date() },
    status: { $in: ["draft", "published"] },
  })
    .sort({ startDateTime: 1 })
    .limit(limit)
    .lean();
};

/* ================= MEETINGS ================= */

export const getMeetingSummary = async (companyId) => {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [todayMeetings, upcomingMeetings] = await Promise.all([
    HRMeeting.countDocuments({
      companyId,
      startDateTime: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    }),
    HRMeeting.find({
      companyId,
      startDateTime: { $gte: new Date() },
      status: { $in: ["scheduled", "rescheduled"] },
    })
      .sort({ startDateTime: 1 })
      .limit(5)
      .lean(),
  ]);

  return {
    todayMeetings,
    upcomingMeetings,
  };
};
