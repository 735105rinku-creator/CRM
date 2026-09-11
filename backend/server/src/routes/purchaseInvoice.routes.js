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
  verifyPurchaseInvoice,
  uploadPurchaseInvoiceAttachment,
  deletePurchaseInvoiceAttachment
} from "../controllers/purchaseInvoice.controller.js";

import {
  uploadPurchaseInvoice
} from "../middleware/upload.middleware.js";


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
   UPLOAD PURCHASE INVOICE ATTACHMENT

   Multipart field:
   invoiceFile

   File rules are enforced by uploadPurchaseInvoice:
   - PDF
   - JPG / JPEG
   - PNG
   - Maximum 1 MB

   Business rules are enforced by the service:
   - Maximum 5 attachments per invoice.
   - Verified invoice may still receive attachments before
     Accounts handoff begins.
   - handing_off / handed_off invoices are locked.
   - accountsVoucherId locks further attachment changes.
============================================================ */

router.post(
  "/:id/attachments",
  uploadPurchaseInvoice.single(
    "invoiceFile"
  ),
  uploadPurchaseInvoiceAttachment
);


/* ============================================================
   DELETE PURCHASE INVOICE ATTACHMENT

   Important:
   - Attachment must belong to the selected Purchase Invoice.
   - Database metadata is removed first.
   - Controller removes the physical file only after successful
     metadata removal.
   - Attachments cannot be deleted once Accounts handoff starts.
============================================================ */

router.delete(
  "/:id/attachments/:attachmentId",
  deletePurchaseInvoiceAttachment
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