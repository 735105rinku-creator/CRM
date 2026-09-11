import {
  Router
} from "express";

import {
  ApiError
} from "../utils/apiError.js";

import {
  createPurchaseInvoice,
  updatePurchaseInvoice,
  getPurchaseInvoice,
  getPurchaseInvoiceMetrics,
  getPurchaseInvoiceReceipts,
  getPurchaseInvoiceReferences,
  handoffPurchaseInvoice,
  listPurchaseInvoices,
  verifyPurchaseInvoice
} from "../controllers/purchaseInvoice.controller.js";


/* ============================================================
   ROUTER
============================================================ */

const router =
  Router();


/* ============================================================
   PURCHASE SENIOR GUARD
============================================================ */

const requireSenior =
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
        "Purchase Senior approval access is required."
      )
    );

  };


/* ============================================================
   REFERENCES
============================================================ */

router.get(
  "/references",
  getPurchaseInvoiceReferences
);


/* ============================================================
   METRICS
============================================================ */

router.get(
  "/metrics",
  getPurchaseInvoiceMetrics
);


/* ============================================================
   ELIGIBLE GRNs FOR PURCHASE ORDER
============================================================ */

router.get(
  "/purchase-orders/:id/goods-receipts",
  getPurchaseInvoiceReceipts
);


/* ============================================================
   LIST PURCHASE INVOICES
============================================================ */

router.get(
  "/",
  listPurchaseInvoices
);


/* ============================================================
   CREATE PURCHASE INVOICE
============================================================ */

router.post(
  "/",
  createPurchaseInvoice
);


/* ============================================================
   UPDATE / CORRECT PURCHASE INVOICE

   Important:
   - Does not require Purchase Senior.
   - Backend service only allows matched/exception invoices.
   - Verified / handed-off invoices remain locked.
============================================================ */

router.put(
  "/:id",
  updatePurchaseInvoice
);


/* ============================================================
   VERIFY PURCHASE INVOICE
============================================================ */

router.patch(
  "/:id/verify",
  requireSenior,
  verifyPurchaseInvoice
);


/* ============================================================
   HANDOFF TO ACCOUNTS
============================================================ */

router.patch(
  "/:id/handoff",
  requireSenior,
  handoffPurchaseInvoice
);


/* ============================================================
   GET PURCHASE INVOICE
============================================================ */

router.get(
  "/:id",
  getPurchaseInvoice
);


export default router;