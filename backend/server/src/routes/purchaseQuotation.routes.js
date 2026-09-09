import express from "express";

import {
  comparePurchaseQuotations,
  createPurchaseQuotation,
  getPurchaseQuotationById,
  getPurchaseQuotationStatusCounts,
  listPurchaseQuotations,
  rejectPurchaseQuotation,
  selectPurchaseQuotation,
  updatePurchaseQuotation,
  updatePurchaseQuotationStatus
} from "../controllers/purchaseQuotation.controller.js";

import {
  ApiError
} from "../utils/apiError.js";


const router =
  express.Router();


/* ============================================================
   PURCHASE SENIOR APPROVAL GUARD
============================================================ */

const requirePurchaseApprovalAccess =
  (
    req,
    _res,
    next
  ) => {

    if (
      req.purchaseAccess?.canApprove ===
      true
    ) {

      return next();
    }


    return next(
      new ApiError(
        403,
        "Purchase Senior approval access is required for this action."
      )
    );
  };


/* ============================================================
   LIST
============================================================ */

router.get(
  "/",
  listPurchaseQuotations
);


/* ============================================================
   STATUS COUNTS
   Must remain before /:id
============================================================ */

router.get(
  "/status-counts",
  getPurchaseQuotationStatusCounts
);


/* ============================================================
   COMPARISON
   Must remain before /:id
============================================================ */

router.get(
  "/comparison",
  comparePurchaseQuotations
);


/* ============================================================
   CREATE
============================================================ */

router.post(
  "/",
  createPurchaseQuotation
);


/* ============================================================
   SELECT
   Purchase Senior only
============================================================ */

router.patch(
  "/:id/select",
  requirePurchaseApprovalAccess,
  selectPurchaseQuotation
);


/* ============================================================
   REJECT
   Purchase Senior only
============================================================ */

router.patch(
  "/:id/reject",
  requirePurchaseApprovalAccess,
  rejectPurchaseQuotation
);


/* ============================================================
   OPERATIONAL STATUS
============================================================ */

router.patch(
  "/:id/status",
  updatePurchaseQuotationStatus
);


/* ============================================================
   GET BY ID
============================================================ */

router.get(
  "/:id",
  getPurchaseQuotationById
);


/* ============================================================
   UPDATE
============================================================ */

router.put(
  "/:id",
  updatePurchaseQuotation
);


export default router;