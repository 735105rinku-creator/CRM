import express from "express";

import {
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
  postVoucher,
  voidVoucher,
  addVoucherAttachments,
  removeVoucherAttachment,
} from "../controllers/voucher.controller.js";

import {
  createPaymentAllocations,
  getPaymentAllocationOptions,
  getPurchasePaymentContext,
} from "../controllers/paymentAllocation.controller.js";

import {
  uploadAccountsProof,
} from "../middleware/upload.middleware.js";

import {
  ApiError,
} from "../utils/apiError.js";


/* ============================================================
   ROUTER
============================================================ */

const router =
  express.Router();


/* ============================================================
   ACCOUNTING VOUCHER OPERATION GUARD

   Read-only Accounting/Voucher visibility remains controlled
   by the parent accounting router.

   Mutation operations require explicit operational authority.

   Company Admin:
     - may retain existing Accounting visibility
     - may perform final Department Invoice authorization
     - cannot create/edit/post/void accounting vouchers
     - cannot upload/remove voucher payment proof
     - cannot create Purchase payment allocations

   Accounts / Finance employee:
     - can perform voucher/payment operations

   Existing Super Admin / HR behaviour is determined by
   resolveAccountingAccess in accounting.routes.js.
============================================================ */

const requireAccountingVoucherOperator =
  (
    req,
    res,
    next
  ) => {

    if (
      req.accountingAccess
        ?.canOperateAccountingVouchers !==
      true
    ) {

      return next(
        new ApiError(
          403,
          "Accounting voucher operations are not allowed for this user."
        )
      );
    }


    return next();
  };


/* ============================================================
   VOUCHER COLLECTION
============================================================ */

/*
 * GET
 * /accounting/vouchers
 *
 * List Vouchers.
 *
 * Read-only.
 */

router.get(
  "/",
  getVouchers
);


/*
 * POST
 * /accounting/vouchers
 *
 * Create a new DRAFT Voucher.
 *
 * Operational.
 */

router.post(
  "/",
  requireAccountingVoucherOperator,
  createVoucher
);


/* ============================================================
   PURCHASE PAYMENT CONTEXT
============================================================ */

/*
 * GET
 * /accounting/vouchers/purchase-payment-context/:purchaseInvoiceId
 *
 * Read-only trusted Purchase payment context.
 *
 * This route intentionally appears before /:voucherId.
 */

router.get(
  "/purchase-payment-context/:purchaseInvoiceId",
  getPurchasePaymentContext
);


/* ============================================================
   VOUCHER ATTACHMENTS
============================================================ */

/*
 * POST
 * /accounting/vouchers/:voucherId/attachments
 *
 * Upload voucher/payment proof.
 *
 * Operational.
 */

router.post(
  "/:voucherId/attachments",
  requireAccountingVoucherOperator,
  uploadAccountsProof.array(
    "proofFiles",
    5
  ),
  addVoucherAttachments
);


/*
 * DELETE
 * /accounting/vouchers/:voucherId/attachments/:attachmentId
 *
 * Remove voucher/payment proof.
 *
 * Operational.
 */

router.delete(
  "/:voucherId/attachments/:attachmentId",
  requireAccountingVoucherOperator,
  removeVoucherAttachment
);


/* ============================================================
   VOUCHER WORKFLOW
============================================================ */

/*
 * POST
 * /accounting/vouchers/:voucherId/post
 *
 * Atomically:
 *   Draft Voucher
 *      ->
 *   Create JournalEntry
 *      ->
 *   Post JournalEntry
 *      ->
 *   Mark Voucher POSTED
 *
 * Operational.
 */

router.post(
  "/:voucherId/post",
  requireAccountingVoucherOperator,
  postVoucher
);


/*
 * POST
 * /accounting/vouchers/:voucherId/void
 *
 * Atomically:
 *   Posted Voucher
 *      ->
 *   Void linked JournalEntry
 *      ->
 *   Mark Voucher VOID
 *
 * Operational.
 */

router.post(
  "/:voucherId/void",
  requireAccountingVoucherOperator,
  voidVoucher
);


/* ============================================================
   PURCHASE PAYMENT ALLOCATION
============================================================ */

/*
 * GET
 * /accounting/vouchers/:voucherId/purchase-allocation-options
 *
 * Read-only.
 */

router.get(
  "/:voucherId/purchase-allocation-options",
  getPaymentAllocationOptions
);


/*
 * POST
 * /accounting/vouchers/:voucherId/purchase-allocations
 *
 * Record Purchase payment allocations.
 *
 * Operational.
 */

router.post(
  "/:voucherId/purchase-allocations",
  requireAccountingVoucherOperator,
  createPaymentAllocations
);


/* ============================================================
   VOUCHER RESOURCE
============================================================ */

/*
 * GET
 * /accounting/vouchers/:voucherId
 *
 * Fetch one Voucher.
 *
 * Read-only.
 */

router.get(
  "/:voucherId",
  getVoucherById
);


/*
 * PATCH
 * /accounting/vouchers/:voucherId
 *
 * Only DRAFT Vouchers are editable.
 *
 * Operational.
 */

router.patch(
  "/:voucherId",
  requireAccountingVoucherOperator,
  updateVoucher
);


export default router;