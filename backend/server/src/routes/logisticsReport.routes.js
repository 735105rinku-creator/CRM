import { Router } from "express";

import {
  getLogisticsReport,
  exportLogisticsReportCsv,
} from "../controllers/logisticsReport.controller.js";

import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";


const router = Router();


/*
 * Base security inherited from parent logistics.routes.js:
 *
 * requireAuth
 *   ->
 * requireTenant
 *   ->
 * requireLogisticsAccess
 *
 * Report-specific authorization is enforced below.
 */


/* ============================================================
   EXPORT REPORT CSV
============================================================ */

router.get(
  "/export.csv",
  requireLogisticsPermission(
    "export",
    "reports"
  ),
  exportLogisticsReportCsv
);


/* ============================================================
   VIEW LOGISTICS REPORT
============================================================ */

router.get(
  "/",
  requireLogisticsPermission(
    "view",
    "reports"
  ),
  getLogisticsReport
);


export default router;