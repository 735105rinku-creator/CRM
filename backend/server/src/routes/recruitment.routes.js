import { Router } from "express";

import {
  createJobOpening,
  getJobOpenings,
  getJobOpeningById,
  updateJobOpening,
  updateJobStatus,
  deleteJobOpening,

  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  updateCandidateStatus,
  deleteCandidate,

  createInterview,
  getInterviews,
  getInterviewById,
  updateInterview,
  updateInterviewResult,
  deleteInterview,createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  updateOfferStatus,
  acceptOffer,
  deleteOffer,
  getCandidateConversionPreview,
  convertCandidateToEmployee,

  getRecruitmentDashboard,
} from "../controllers/recruitment.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

/* ================= DASHBOARD ================= */

router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getRecruitmentDashboard
);

/* ================= JOB OPENINGS ================= */

router.post(
  "/jobs",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createJobOpening
);

router.get(
  "/jobs",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getJobOpenings
);

router.get(
  "/jobs/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getJobOpeningById
);

router.patch(
  "/jobs/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateJobOpening
);

router.patch(
  "/jobs/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateJobStatus
);

router.delete(
  "/jobs/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteJobOpening
);

/* ================= CANDIDATES ================= */

router.post(
  "/candidates",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createCandidate
);

router.get(
  "/candidates",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getCandidates
);

router.get(
  "/candidates/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getCandidateById
);

router.patch(
  "/candidates/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateCandidate
);

router.patch(
  "/candidates/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateCandidateStatus
);

router.delete(
  "/candidates/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteCandidate
);

/* ================= INTERVIEWS ================= */

router.post(
  "/interviews",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createInterview
);

router.get(
  "/interviews",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getInterviews
);

router.get(
  "/interviews/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getInterviewById
);

router.patch(
  "/interviews/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateInterview
);

router.patch(
  "/interviews/:id/result",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateInterviewResult
);

router.delete(
  "/interviews/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteInterview
);
/* ================= OFFER LETTERS ================= */

router.post(
  "/offers",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createOffer
);

router.get(
  "/offers",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getOffers
);

router.get(
  "/offers/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getOfferById
);

router.patch(
  "/offers/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateOffer
);

router.patch(
  "/offers/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateOfferStatus
);

router.delete(
  "/offers/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteOffer
);

/* ================= CANDIDATE CONVERSION ================= */

router.post(
  "/candidates/:id/accept-offer",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  acceptOffer
);

router.get(
  "/candidates/:id/conversion-preview",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getCandidateConversionPreview
);

router.post(
  "/candidates/:id/convert",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  convertCandidateToEmployee
);

export default router;