import { Router } from "express";

import {
  createLeaveType,
  getLeaveTypes,
  updateLeaveType,
  deleteLeaveType,

  createLeavePolicy,
  getLeavePolicies,
  updateLeavePolicy,
  deleteLeavePolicy,

  createLeaveBalance,
  getLeaveBalances,
  getMyLeaveBalances,
  updateLeaveBalance,

  applyLeave,
  applyMyLeave,
  getLeaveRequests,
  getMyLeaveRequests,
  updateLeaveRequestStatus,

  getLeaveCalendar,
  getLeaveDashboard,
} from "../controllers/leave.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/* ================= DASHBOARD / CALENDAR ================= */

router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getLeaveDashboard
);

router.get(
  "/calendar",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getLeaveCalendar
);

/* ================= LEAVE TYPE ================= */

router.post(
  "/types",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createLeaveType
);

router.get(
  "/types",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getLeaveTypes
);

router.patch(
  "/types/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateLeaveType
);

router.delete(
  "/types/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteLeaveType
);

/* ================= LEAVE POLICY ================= */

router.post(
  "/policies",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createLeavePolicy
);

router.get(
  "/policies",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getLeavePolicies
);

router.patch(
  "/policies/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateLeavePolicy
);

router.delete(
  "/policies/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteLeavePolicy
);

/* ================= LEAVE BALANCE ================= */

router.get("/self/balances", getMyLeaveBalances);

router.post(
  "/balances",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createLeaveBalance
);

router.get(
  "/balances",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getLeaveBalances
);

router.patch(
  "/balances/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateLeaveBalance
);

/* ================= LEAVE REQUEST ================= */

router.post("/self/requests", applyMyLeave);

router.get("/self/requests", getMyLeaveRequests);

router.post(
  "/requests",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  applyLeave
);

router.get(
  "/requests",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getLeaveRequests
);

router.patch(
  "/requests/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateLeaveRequestStatus
);

export default router;
