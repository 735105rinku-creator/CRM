import { Router } from "express";

import {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
  getHolidayDashboard,
} from "../controllers/holiday.controller.js";

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
  "/dashboard",
  requirePermission(PERMISSIONS.PROFILE_READ),
  getHolidayDashboard
);

router.post(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createHoliday
);

router.get(
  "/",
  requirePermission(PERMISSIONS.PROFILE_READ),
  getHolidays
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.PROFILE_READ),
  getHolidayById
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateHoliday
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteHoliday
);

export default router;
