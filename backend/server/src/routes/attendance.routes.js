import { Router } from "express";


import {
  createShift,
  getShifts,
  updateShift,
  deleteShift,

  createAttendancePolicy,
  getAttendancePolicies,
  updateAttendancePolicy,
  deleteAttendancePolicy,

  checkIn,
  checkOut,
  markManualAttendance,
  getAttendance,
  getMyAttendanceToday,
  getMyAttendanceRecords,
  updateAttendanceStatus,

  createRegularization,
  getRegularizations,
  updateRegularizationStatus,

  getAttendanceDashboard,
  getMonthlyAttendance,
} from "../controllers/attendance.controller.js";


import {
  requireAuth,
  requirePermission,
} from "../middleware/auth.middleware.js";


import {
  requireTenant
} from "../middleware/tenant.middleware.js";


import {
  requireDesktopAttendance
} from "../middleware/attendanceDevice.middleware.js";


import {
  PERMISSIONS
} from "../constants/permissions.js";


const router =
  Router();


/* ======================================================
   GLOBAL SECURITY
====================================================== */

router.use(
  requireAuth
);


router.use(
  requireTenant
);


/* ======================================================
   DASHBOARD
====================================================== */

router.get(
  "/dashboard",

  requirePermission(
    PERMISSIONS.EMPLOYEE_READ
  ),

  getAttendanceDashboard
);


/* ======================================================
   SHIFT
====================================================== */

router.post(
  "/shifts",

  requirePermission(
    PERMISSIONS.EMPLOYEE_CREATE
  ),

  createShift
);


router.get(
  "/shifts",

  requirePermission(
    PERMISSIONS.EMPLOYEE_READ
  ),

  getShifts
);


router.patch(
  "/shifts/:id",

  requirePermission(
    PERMISSIONS.EMPLOYEE_UPDATE
  ),

  updateShift
);


router.delete(
  "/shifts/:id",

  requirePermission(
    PERMISSIONS.EMPLOYEE_DELETE
  ),

  deleteShift
);


/* ======================================================
   ATTENDANCE POLICY
====================================================== */

router.post(
  "/policies",

  requirePermission(
    PERMISSIONS.EMPLOYEE_CREATE
  ),

  createAttendancePolicy
);


router.get(
  "/policies",

  requirePermission(
    PERMISSIONS.EMPLOYEE_READ
  ),

  getAttendancePolicies
);


router.patch(
  "/policies/:id",

  requirePermission(
    PERMISSIONS.EMPLOYEE_UPDATE
  ),

  updateAttendancePolicy
);


router.delete(
  "/policies/:id",

  requirePermission(
    PERMISSIONS.EMPLOYEE_DELETE
  ),

  deleteAttendancePolicy
);


/* ======================================================
   DAILY ATTENDANCE

   IMPORTANT:
   Punch In / Punch Out are allowed only from
   desktop/laptop devices.

   Mobile/tablet requests are rejected by:
   requireDesktopAttendance
====================================================== */


/* ------------------------------------------------------
   SELF CHECK-IN
------------------------------------------------------ */

router.post(
  "/self/check-in",

  requireDesktopAttendance,

  checkIn
);


/* ------------------------------------------------------
   SELF CHECK-OUT
------------------------------------------------------ */

router.post(
  "/self/check-out",

  requireDesktopAttendance,

  checkOut
);


/* ------------------------------------------------------
   LEGACY / ALTERNATE CHECK-IN

   Keep protected so mobile users cannot bypass
   /self/check-in restriction.
------------------------------------------------------ */

router.post(
  "/check-in",

  requireDesktopAttendance,

  checkIn
);


/* ------------------------------------------------------
   LEGACY / ALTERNATE CHECK-OUT
------------------------------------------------------ */

router.post(
  "/check-out",

  requireDesktopAttendance,

  checkOut
);


/* ------------------------------------------------------
   TODAY'S ATTENDANCE
------------------------------------------------------ */

router.get(
  "/self/today",

  getMyAttendanceToday
);


/* ------------------------------------------------------
   MY ATTENDANCE HISTORY
------------------------------------------------------ */

router.get(
  "/self/records",

  getMyAttendanceRecords
);


/* ======================================================
   MANUAL ATTENDANCE

   HR / authorized management can still manually
   manage attendance.

   Desktop restriction is NOT applied here.
====================================================== */

router.post(
  "/manual",

  requirePermission(
    PERMISSIONS.EMPLOYEE_UPDATE
  ),

  markManualAttendance
);


/* ======================================================
   ATTENDANCE RECORDS
====================================================== */

router.get(
  "/records",

  requirePermission(
    PERMISSIONS.EMPLOYEE_READ
  ),

  getAttendance
);


router.patch(
  "/records/:id/status",

  requirePermission(
    PERMISSIONS.EMPLOYEE_UPDATE
  ),

  updateAttendanceStatus
);


/* ======================================================
   REGULARIZATION
====================================================== */

router.post(
  "/regularizations",

  createRegularization
);


router.get(
  "/regularizations",

  requirePermission(
    PERMISSIONS.EMPLOYEE_READ
  ),

  getRegularizations
);


router.patch(
  "/regularizations/:id/status",

  requirePermission(
    PERMISSIONS.EMPLOYEE_UPDATE
  ),

  updateRegularizationStatus
);


/* ======================================================
   REPORTS
====================================================== */

router.get(
  "/monthly/:employeeCode",

  requirePermission(
    PERMISSIONS.EMPLOYEE_READ
  ),

  getMonthlyAttendance
);


export default router;