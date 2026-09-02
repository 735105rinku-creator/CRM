import { Router } from "express";

import {
  createEmployee,
  getEmployees,
  checkEmployeeCodeAvailability,
  getEmployeeById,
  updateEmployee,
  updateEmployeePhoto,
  updateEmployeeStatus,
  updateWorkFromHomeAttendance,
  deleteEmployee,

  upsertEmployeeFamily,
  getEmployeeFamily,

  upsertEmployeeBank,
  getEmployeeBank,

  upsertEmployeeStatutory,
  getEmployeeStatutory,

  upsertEmployeeDocuments,
  getEmployeeDocuments,
  uploadEmployeeDocuments,

  getEmployeeDashboard,
} from "../controllers/employee.controller.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";

import { requireTenant } from "../middleware/tenant.middleware.js";
import { uploadEmployeeDocument, uploadEmployeePhoto } from "../middleware/upload.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = Router();

const hasPermission = (user, permission) => {
  const permissions = new Set([...(user?.permissions || []), ...(user?.roleRef?.permissions || [])]);
  return permissions.has(permission);
};

const isManagerUser = (user) => {
  const roleName = String(user?.roleRef?.name || user?.role || "").toLowerCase();
  return ["manager", "department_head", "team_leader"].includes(roleName);
};

const requireEmployeeListRead = (req, res, next) => {
  if (req.user?.role === "super_admin" || req.user?.roleRef?.level === 0) return next();
  if (hasPermission(req.user, PERMISSIONS.EMPLOYEE_READ)) return next();
  if (isManagerUser(req.user) && req.user?.employee) return next();
  return res.status(403).json({ success: false, message: "Permission denied", errors: [] });
};

const requireEmployeeReadOrSelf = (req, res, next) => {
  if (req.user?.role === "super_admin" || req.user?.roleRef?.level === 0) return next();
  if (hasPermission(req.user, PERMISSIONS.EMPLOYEE_READ)) return next();

  const ownEmployeeId = req.user?.employee?._id || req.user?.employee;
  if (ownEmployeeId && String(ownEmployeeId) === String(req.params.id)) return next();

  return res.status(403).json({ success: false, message: "Permission denied", errors: [] });
};

router.use(requireAuth);
router.use(requireTenant);

/* ---------------- Dashboard ---------------- */

router.get(
  "/dashboard",
  requirePermission(PERMISSIONS.PROFILE_READ),
  getEmployeeDashboard
);

/* ---------------- Employee Core ---------------- */

router.post(
  "/",
  requirePermission(PERMISSIONS.EMPLOYEE_CREATE),
  createEmployee
);

router.get(
  "/",
  requireEmployeeListRead,
  getEmployees
);

router.get(
  "/code-availability",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  checkEmployeeCodeAvailability
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeById
);

router.patch(
  "/:id/photo",
  requirePermission(PERMISSIONS.PROFILE_UPDATE),
  (req, res, next) => {
    uploadEmployeePhoto.single("photo")(req, res, (error) => {
      if (error) return next(error);
      return next();
    });
  },
  updateEmployeePhoto
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateEmployee
);

router.patch(
  "/:id/work-from-home-attendance",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateWorkFromHomeAttendance
);

router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  updateEmployeeStatus
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.EMPLOYEE_DELETE),
  deleteEmployee
);

/* ---------------- Family ---------------- */

router.get(
  "/:id/family",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeFamily
);

router.put(
  "/:id/family",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upsertEmployeeFamily
);

/* ---------------- Bank ---------------- */

router.get(
  "/:id/bank",
  requireEmployeeReadOrSelf,
  getEmployeeBank
);

router.put(
  "/:id/bank",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upsertEmployeeBank
);

/* ---------------- Statutory ---------------- */

router.get(
  "/:id/statutory",
  requirePermission(PERMISSIONS.EMPLOYEE_READ),
  getEmployeeStatutory
);

router.put(
  "/:id/statutory",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upsertEmployeeStatutory
);

/* ---------------- Documents ---------------- */

router.get(
  "/:id/documents",
  requireEmployeeReadOrSelf,
  getEmployeeDocuments
);

router.put(
  "/:id/documents",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  upsertEmployeeDocuments
);
router.post(
  "/:id/documents/upload",
  requirePermission(PERMISSIONS.EMPLOYEE_UPDATE),
  (req, res, next) => {
    uploadEmployeeDocument.array("documents", 10)(req, res, (error) => {
      if (error) return next(error);
      return next();
    });
  },
  uploadEmployeeDocuments
);

export default router;



