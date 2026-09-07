import { Router }
  from "express";

import {
  createLogisticsVendorPayment,
  getLogisticsVendorPayments,
  getLogisticsVendorPaymentSummary,
  getLogisticsVendorPaymentById,
  getLogisticsVendorPaymentVendorOptions,
  downloadLogisticsVendorPaymentProof,
  updateLogisticsVendorPayment,
  addLogisticsVendorPaymentTransaction,
  deleteLogisticsVendorPayment,
} from "../controllers/logisticsVendorPayment.controller.js";

import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";

import {
  uploadVendorPaymentProof,
} from "../middleware/upload.middleware.js";


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
   VENDOR OPTIONS FOR PAYMENT FORM

   IMPORTANT:
   This is a restricted read-only lookup.

   It allows a Logistics employee with Vendor Payment view
   permission to select an existing Vendor by normal name.

   It does NOT give the employee general Vendor Master access.
============================================================ */

router.get(
  "/vendor-options",
  requireLogisticsPermission(
    "view",
    "vendorPayments"
  ),
  getLogisticsVendorPaymentVendorOptions
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

    /*
     * Optional payment proof upload.
     *
     * Allowed:
     * JPG / JPEG / PNG / PDF
     *
     * Field name expected from frontend:
     * paymentProof
     *
     * If no file is sent,
     * multer continues normally.
     */
    uploadVendorPaymentProof.single(
      "paymentProof"
    ),

    createLogisticsVendorPayment
  );


/* ============================================================
   DOWNLOAD PAYMENT PROOF

   IMPORTANT:
   Keep this ABOVE /:id.
============================================================ */

router.get(
  "/:id/payment-proof/download",
  requireLogisticsPermission(
    "view",
    "vendorPayments"
  ),
  downloadLogisticsVendorPaymentProof
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

    /*
     * Optional replacement/new payment proof.
     *
     * Existing payment can still be updated
     * without uploading any file.
     */
    uploadVendorPaymentProof.single(
      "paymentProof"
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