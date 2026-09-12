import { Router } from "express";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  requireTenant,
} from "../middleware/tenant.middleware.js";

import {
  requireLogisticsAccess,
} from "../middleware/logisticsAccess.middleware.js";

import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";

import {
  createLogisticsInvoice,
  getLogisticsInvoices,
  getLogisticsInvoiceSummary,
  getLogisticsInvoiceById,
  updateLogisticsInvoice,
  uploadLogisticsInvoiceCopy,
  previewLogisticsInvoiceCopy,
  handoffLogisticsInvoiceToAccounts,
  deleteLogisticsInvoice,
} from "../controllers/logisticsInvoice.controller.js";

import {
  uploadSingleLogisticsDocument,
} from "../middleware/logisticsDocumentUpload.middleware.js";


const router = Router();


/* ============================================================
   BASE SECURITY
============================================================ */

router.use(
  requireAuth,
  requireTenant,
  requireLogisticsAccess
);


/* ============================================================
   INVOICE SUMMARY
============================================================ */

router.get(
  "/summary",

  requireLogisticsPermission(
    "view",
    "invoices"
  ),

  getLogisticsInvoiceSummary
);


/* ============================================================
   INVOICE LIST / CREATE
============================================================ */

router
  .route("/")
  .get(
    requireLogisticsPermission(
      "view",
      "invoices"
    ),

    getLogisticsInvoices
  )
  .post(
    requireLogisticsPermission(
      "create",
      "invoices"
    ),

    createLogisticsInvoice
  );


/* ============================================================
   UPLOAD / REPLACE INVOICE COPY

   Must remain above generic /:id route for clarity.

   Existing Logistics document upload flow is preserved.
============================================================ */

router.post(
  "/:id/invoice-copy",

  requireLogisticsPermission(
    "edit",
    "invoices"
  ),

  uploadSingleLogisticsDocument,

  uploadLogisticsInvoiceCopy
);


/* ============================================================
   PREVIEW INVOICE COPY
============================================================ */

router.get(
  "/:id/invoice-copy/preview",

  requireLogisticsPermission(
    "view",
    "invoices"
  ),

  previewLogisticsInvoiceCopy
);


/* ============================================================
   SEND LOGISTICS CUSTOMER INVOICE TO ACCOUNTS

   Route-level permission:
   invoices.edit

   Final business-level authorization is enforced through:

   req.logisticsAccess.canHandoffToAccounts

   Allowed:
   - department_head
   - team_leader

   Normal Logistics employee:
   - cannot handoff

   Company Admin / Super Admin / HR management context:
   - does not automatically receive operational handoff rights
     from this route.

   Service also validates:
   - invoice is issued
   - invoice is not cancelled
   - balanceDue > 0
   - invoice copy exists
   - handoff is idempotent
============================================================ */

router.post(
  "/:id/handoff",

  requireLogisticsPermission(
    "edit",
    "invoices"
  ),

  handoffLogisticsInvoiceToAccounts
);


/* ============================================================
   INVOICE DETAIL / UPDATE / DELETE
============================================================ */

router
  .route("/:id")
  .get(
    requireLogisticsPermission(
      "view",
      "invoices"
    ),

    getLogisticsInvoiceById
  )
  .patch(
    requireLogisticsPermission(
      "edit",
      "invoices"
    ),

    updateLogisticsInvoice
  )
  .delete(
    requireLogisticsPermission(
      "delete",
      "invoices"
    ),

    deleteLogisticsInvoice
  );


export default router;