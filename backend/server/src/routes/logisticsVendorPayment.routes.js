import { Router }
  from "express";

import {
  createLogisticsVendorPayment,
  getLogisticsVendorPayments,
  getLogisticsVendorPaymentSummary,
  getLogisticsVendorPaymentById,
  updateLogisticsVendorPayment,
  addLogisticsVendorPaymentTransaction,
  deleteLogisticsVendorPayment,
} from "../controllers/logisticsVendorPayment.controller.js";

import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";


const router =
  Router();


/*
 * Security inherited from parent logistics.routes.js:
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
   VENDOR PAYMENT SUMMARY
============================================================ */

router.get(
  "/summary",
  requireLogisticsPermission(
    "view",
    "vendorPayments"
  ),
  getLogisticsVendorPaymentSummary
);


/* ============================================================
   VENDOR PAYMENT LIST / CREATE
============================================================ */

router
  .route("/")
  .get(
    requireLogisticsPermission(
      "view",
      "vendorPayments"
    ),
    getLogisticsVendorPayments
  )
  .post(
    requireLogisticsPermission(
      "create",
      "vendorPayments"
    ),
    createLogisticsVendorPayment
  );


/* ============================================================
   ADD PAYMENT TRANSACTION

   This modifies an existing Vendor Payment record,
   therefore "edit" permission is required.
============================================================ */

router.post(
  "/:id/payments",
  requireLogisticsPermission(
    "edit",
    "vendorPayments"
  ),
  addLogisticsVendorPaymentTransaction
);


/* ============================================================
   VENDOR PAYMENT DETAIL / UPDATE / DELETE
============================================================ */

router
  .route("/:id")
  .get(
    requireLogisticsPermission(
      "view",
      "vendorPayments"
    ),
    getLogisticsVendorPaymentById
  )
  .patch(
    requireLogisticsPermission(
      "edit",
      "vendorPayments"
    ),
    updateLogisticsVendorPayment
  )
  .delete(
    requireLogisticsPermission(
      "delete",
      "vendorPayments"
    ),
    deleteLogisticsVendorPayment
  );


export default router;