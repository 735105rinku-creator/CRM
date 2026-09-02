import { Router } from "express";

import {
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getRecruitmentReport,
  getJobOpeningReport,
  getPayrollReport,
  getPayslipReport,
  getHolidayReport,
  getEventReport,
  getMeetingReport,
  getHRReportSummary,
} from "../controllers/hrReport.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get(
  "/summary",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getHRReportSummary
);

router.get(
  "/employees",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeReport
);

router.get(
  "/attendance",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getAttendanceReport
);

router.get(
  "/leave",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getLeaveReport
);

router.get(
  "/recruitment",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getRecruitmentReport
);

router.get(
  "/jobs",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getJobOpeningReport
);

router.get(
  "/payroll",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getPayrollReport
);

router.get(
  "/payslips",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getPayslipReport
);

router.get(
  "/holidays",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getHolidayReport
);

router.get(
  "/events",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEventReport
);

router.get(
  "/meetings",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getMeetingReport
);

export default router;