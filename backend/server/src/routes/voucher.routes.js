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
} from "../controllers/paymentAllocation.controller.js";

import {
  uploadAccountsProof,
} from "../middleware/upload.middleware.js";


/* ============================================================
   ROUTER
============================================================ */

const router =
  express.Router();


/* ============================================================
   VOUCHER COLLECTION
============================================================ */

/*
 * GET
 * /accounting/vouchers
 *
 * List Vouchers.
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
 */

router.post(
  "/",
  createVoucher
);


/* ============================================================
   VOUCHER ATTACHMENTS
============================================================ */

router.post(
  "/:voucherId/attachments",
  uploadAccountsProof.array(
    "proofFiles",
    5
  ),
  addVoucherAttachments
);


router.delete(
  "/:voucherId/attachments/:attachmentId",
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
 */

router.post(
  "/:voucherId/post",
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
 */

router.post(
  "/:voucherId/void",
  voidVoucher
);


router.get(
  "/:voucherId/purchase-allocation-options",
  getPaymentAllocationOptions
);


router.post(
  "/:voucherId/purchase-allocations",
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
 */

router.patch(
  "/:voucherId",
  updateVoucher
);


/* ============================================================
   IMPORTANT

   Physical DELETE route intentionally does not exist.

   Accounting history is retained.

   Posted Vouchers are immutable.

   Void operations preserve the accounting audit trail.
============================================================ */


export default router;
