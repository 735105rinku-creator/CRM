import { Router } from "express";

import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  updateCompanyStatus,
  deleteCompany,
  createCompanyAdmin,
  getMyCompanyProfile,
  updateMyCompanyProfile,
} from "../controllers/company.controller.js";

import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);

router.get("/my/profile", requirePermission(PERMISSIONS.COMPANY_PROFILE_READ),getMyCompanyProfile);

router.patch(
  "/my/profile",
  requirePermission(PERMISSIONS.COMPANY_PROFILE_UPDATE),
  updateMyCompanyProfile
);

router.post(
  "/",
  requirePermission(PERMISSIONS.COMPANY_CREATE),
  createCompany
);

router.get(
  "/",
  requirePermission(PERMISSIONS.COMPANY_READ),
  getCompanies
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.COMPANY_READ),
  getCompanyById
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.COMPANY_UPDATE),
  updateCompany
);

router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.COMPANY_STATUS_UPDATE),
  updateCompanyStatus
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.COMPANY_DELETE),
  deleteCompany
);

router.post(
  "/:id/company-admin",
  requirePermission(PERMISSIONS.COMPANY_ADMIN_CREATE),
  createCompanyAdmin
);

export default router;