import { Router } from "express";

import { getHRDashboard } from "../controllers/hrDashboard.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/*
|--------------------------------------------------------------------------
| HR Dashboard
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getHRDashboard
);

export default router;