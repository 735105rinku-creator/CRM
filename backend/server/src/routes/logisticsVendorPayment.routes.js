import { Router }
  from "express";

import {
  createLogisticsVendorPayment,
  getLogisticsVendorPayments,
  getLogisticsVendorPaymentSummary,
  getLogisticsVendorPaymentById,
  getLogisticsVendorPaymentVendorOptions,
  downloadLogisticsVendorPaymentProof,
  uploadLogisticsVendorPaymentBill,
  downloadLogisticsVendorPaymentBill,
  handoffLogisticsVendorPaymentToAccounts,
  updateLogisticsVendorPayment,
  addLogisticsVendorPaymentTransaction,
  deleteLogisticsVendorPayment,
} from "../controllers/logisticsVendorPayment.controller.js";

import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";

import {
  uploadVendorPaymentProof,
  uploadLogisticsVendorBill,
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
     *
     * IMPORTANT:
     * Vendor Bill is NOT uploaded from this endpoint.
     * It has its own separate endpoint below.
     */
    uploadVendorPaymentProof.single(
      "paymentProof"
    ),

    createLogisticsVendorPayment
  );


/* ============================================================
   DOWNLOAD PAYMENT PROOF

   IMPORTANT:
   Keep specific routes ABOVE /:id.
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
   UPLOAD / REPLACE VENDOR BILL

   This is separate from paymentProof.

   Expected multipart field:
   vendorBill

   Allowed:
   JPG / JPEG / PNG / PDF

   Max:
   1 MB

   Physical file:
   public/uploads/logistics-vendor-bills/

   MongoDB:
   metadata / URL only.

   Once Accounts handoff exists, service blocks replacement.
============================================================ */

router.post(
  "/:id/vendor-bill",

  requireLogisticsPermission(
    "edit",
    "vendorPayments"
  ),

  uploadLogisticsVendorBill.single(
    "vendorBill"
  ),

  uploadLogisticsVendorPaymentBill
);


/* ============================================================
   DOWNLOAD VENDOR BILL

   Company-scoped secure download.

   Accounts and Logistics will reference the same document URL /
   source document. No duplicate file storage is required here.
============================================================ */

router.get(
  "/:id/vendor-bill/download",

  requireLogisticsPermission(
    "view",
    "vendorPayments"
  ),

  downloadLogisticsVendorPaymentBill
);


/* ============================================================
   SEND VENDOR PAYMENT TO ACCOUNTS

   Route-level permission:
   vendorPayments.edit

   Final business authorization:
   requireLogisticsAccess has already populated:

   req.logisticsAccess.canHandoffToAccounts

   Service permits only:
   - department_head
   - team_leader

   Normal Logistics employee:
   rejected with 403.

   Super Admin / Company Admin / HR management context:
   does NOT automatically receive this operational handoff.

   Handoff is idempotent.
============================================================ */

router.post(
  "/:id/handoff",

  requireLogisticsPermission(
    "edit",
    "vendorPayments"
  ),

  handoffLogisticsVendorPaymentToAccounts
);


/* ============================================================
   ADD PAYMENT TRANSACTION

   Existing direct Logistics payment flow is preserved BEFORE
   Accounts handoff.

   After Accounts handoff:
   service returns 409 and Accounts owns settlement.
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
     *
     * IMPORTANT:
     * This remains PAYMENT PROOF only.
     * Vendor Bill uses /:id/vendor-bill.
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