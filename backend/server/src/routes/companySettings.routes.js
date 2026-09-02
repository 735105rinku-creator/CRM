import { Router } from "express";

import {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,

  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,

  createDesignation,
  getDesignations,
  updateDesignation,
  deleteDesignation,

  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
} from "../controllers/companySettings.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { ROLE_PERMISSIONS, ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/apiError.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);
const requireDepartmentStructureManage = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Authentication required"));
  if ([ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.HR].includes(req.user.role)) return next();
  const permissions = Array.from(new Set([...(req.user.permissions || []), ...(req.user.roleRef?.permissions || []), ...(ROLE_PERMISSIONS[req.user.role] || [])]));
  if (permissions.includes(PERMISSIONS.COMPANY_PROFILE_UPDATE)) return next();
  return next(new ApiError(403, "Permission denied"));
};

/* ---------------- Branch ---------------- */

router.post(
  "/branches",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  createBranch
);

router.get(
  "/branches",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),
  getBranches
);

router.patch(
  "/branches/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  updateBranch
);

router.delete(
  "/branches/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  deleteBranch
);

/* ---------------- Department ---------------- */

router.post(
  "/departments",
  requireDepartmentStructureManage,
  createDepartment
);

router.get(
  "/departments",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),
  getDepartments
);

router.patch(
  "/departments/:id",
  requireDepartmentStructureManage,
  updateDepartment
);

router.delete(
  "/departments/:id",
  requireDepartmentStructureManage,
  deleteDepartment
);

/* ---------------- Designation ---------------- */

router.post(
  "/designations",
  requireDepartmentStructureManage,
  createDesignation
);

router.get(
  "/designations",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),
  getDesignations
);

router.patch(
  "/designations/:id",
  requireDepartmentStructureManage,
  updateDesignation
);

router.delete(
  "/designations/:id",
  requireDepartmentStructureManage,
  deleteDesignation
);

/* ---------------- Holiday ---------------- */

router.post(
  "/holidays",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  createHoliday
);

router.get(
  "/holidays",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),
  getHolidays
);

router.patch(
  "/holidays/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  updateHoliday
);

router.delete(
  "/holidays/:id",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  deleteHoliday
);

export default router;

