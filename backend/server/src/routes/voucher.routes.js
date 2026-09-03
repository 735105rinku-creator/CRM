import express from "express";

import {
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
  postVoucher,
  voidVoucher,
} from "../controllers/voucher.controller.js";


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
