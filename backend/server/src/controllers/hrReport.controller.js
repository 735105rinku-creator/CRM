import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
  getEmployeeReportService,
  getAttendanceReportService,
  getLeaveReportService,
  getRecruitmentReportService,
  getJobOpeningReportService,
  getPayrollReportService,
  getPayslipReportService,
  getHolidayReportService,
  getEventReportService,
  getMeetingReportService,
  getHRReportSummaryService,
} from "../services/hrReport.service.js";

export const getEmployeeReport = asyncHandler(async (req, res) => {
  const data = await getEmployeeReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Employee report fetched successfully")
  );
});

export const getAttendanceReport = asyncHandler(async (req, res) => {
  const data = await getAttendanceReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Attendance report fetched successfully")
  );
});

export const getLeaveReport = asyncHandler(async (req, res) => {
  const data = await getLeaveReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Leave report fetched successfully")
  );
});

export const getRecruitmentReport = asyncHandler(async (req, res) => {
  const data = await getRecruitmentReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Recruitment report fetched successfully")
  );
});

export const getJobOpeningReport = asyncHandler(async (req, res) => {
  const data = await getJobOpeningReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Job opening report fetched successfully")
  );
});

export const getPayrollReport = asyncHandler(async (req, res) => {
  const data = await getPayrollReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Payroll report fetched successfully")
  );
});

export const getPayslipReport = asyncHandler(async (req, res) => {
  const data = await getPayslipReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Payslip report fetched successfully")
  );
});

export const getHolidayReport = asyncHandler(async (req, res) => {
  const data = await getHolidayReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Holiday report fetched successfully")
  );
});

export const getEventReport = asyncHandler(async (req, res) => {
  const data = await getEventReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Event report fetched successfully")
  );
});

export const getMeetingReport = asyncHandler(async (req, res) => {
  const data = await getMeetingReportService(req.user, req.query);

  res.status(200).json(
    new ApiResponse(200, data, "Meeting report fetched successfully")
  );
});

export const getHRReportSummary = asyncHandler(async (req, res) => {
  const data = await getHRReportSummaryService(req.user);

  res.status(200).json(
    new ApiResponse(200, data, "HR report summary fetched successfully")
  );
});