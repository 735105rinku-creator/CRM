import { Router } from "express";

import {
  createLogisticsVendor,
  getLogisticsVendors,
  getLogisticsVendorSummary,
  getLogisticsVendorById,
  updateLogisticsVendor,
  deleteLogisticsVendor,
} from "../controllers/logisticsVendor.controller.js";

import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";


const router = Router();


/*
 * Security inherited from logistics.routes.js:
 *
 * requireAuth
 *   ->
 * requireTenant
 *   ->
 * requireLogisticsAccess
 *
 * Action-level authorization is enforced below.
 */


/* ============================================================
   VENDOR SUMMARY
============================================================ */

router.get(
  "/summary",
  requireLogisticsPermission(
    "view",
    "vendors"
  ),
  getLogisticsVendorSummary
);


/* ============================================================
   VENDOR LIST / CREATE
============================================================ */

router
  .route("/")
  .get(
    requireLogisticsPermission(
      "view",
      "vendors"
    ),
    getLogisticsVendors
  )
  .post(
    requireLogisticsPermission(
      "create",
      "vendors"
    ),
    createLogisticsVendor
  );


/* ============================================================
   VENDOR DETAIL / UPDATE / DELETE
============================================================ */

router
  .route("/:id")
  .get(
    requireLogisticsPermission(
      "view",
      "vendors"
    ),
    getLogisticsVendorById
  )
  .patch(
    requireLogisticsPermission(
      "edit",
      "vendors"
    ),
    updateLogisticsVendor
  )
  .delete(
    requireLogisticsPermission(
      "delete",
      "vendors"
    ),
    deleteLogisticsVendor
  );


export default router;