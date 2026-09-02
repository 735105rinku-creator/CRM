import { ApiError } from "../utils/apiError.js";
import { Company } from "../models/Company.js";

import {
  getEmployeeSummary,
  getUpcomingBirthdays,
  getUpcomingWorkAnniversaries,
  getDepartmentWiseEmployees,
  getBranchWiseEmployees,
  getAttendanceSummaryToday,
  getLeaveSummary,
  getEmployeesOnLeaveToday,
  getRecruitmentSummary,
  getPayrollSummary,
  getUpcomingHolidaySummary,
  getUpcomingEventSummary,
  getMeetingSummary,
} from "../repositories/hrDashboard.repository.js";

const getCompanyId = (currentUser) => {
  if (!currentUser.companyId) {
    throw new ApiError(403, "Company context missing.");
  }

  return currentUser.companyId._id || currentUser.companyId;
};

export const getHRDashboardService = async (currentUser) => {
  const companyId = getCompanyId(currentUser);

  const [
    employeeSummary,
    upcomingBirthdays,
    upcomingWorkAnniversaries,
    departmentWiseEmployees,
    branchWiseEmployees,
    attendanceToday,
    leaveSummary,
    employeesOnLeaveToday,
    recruitmentSummary,
    payrollSummary,
    upcomingHolidays,
    upcomingEvents,
    meetingSummary,
    company,
  ] = await Promise.all([
    getEmployeeSummary(companyId),
    getUpcomingBirthdays(companyId, 10),
    getUpcomingWorkAnniversaries(companyId, 10),
    getDepartmentWiseEmployees(companyId),
    getBranchWiseEmployees(companyId),
    getAttendanceSummaryToday(companyId),
    getLeaveSummary(companyId),
    getEmployeesOnLeaveToday(companyId),
    getRecruitmentSummary(companyId),
    getPayrollSummary(companyId),
    getUpcomingHolidaySummary(companyId, 5),
    getUpcomingEventSummary(companyId, 5),
    getMeetingSummary(companyId),
    Company.findById(companyId).select("companyName companyCode logo settings").lean(),
  ]);

  return {
    company,
    employees: {
      summary: employeeSummary,
      upcomingBirthdays,
      upcomingWorkAnniversaries,
      departmentWiseEmployees,
      branchWiseEmployees,
    },
    attendance: {
      today: attendanceToday,
    },
    leave: {
      summary: leaveSummary,
      employeesOnLeaveToday,
    },
    recruitment: recruitmentSummary,
    payroll: payrollSummary,
    holidays: {
      upcoming: upcomingHolidays,
    },
    events: {
      upcoming: upcomingEvents,
    },
    meetings: meetingSummary,
  };
};

