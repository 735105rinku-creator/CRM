import express from "express";

import {
  createVoucher,
  getVouchers,
  getVoucherById,
  updateVoucher,
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

   POST /:voucherId/post
   POST /:voucherId/void

   will be added in the next posting-integration phase,
   where Voucher lifecycle is linked to JournalEntry.
============================================================ */


export default router;
