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

router.post(
  "/:id/invoice-copy",
  requireLogisticsPermission(
    "edit",
    "invoices"
  ),
  uploadSingleLogisticsDocument,
  uploadLogisticsInvoiceCopy
);

router.get(
  "/:id/invoice-copy/preview",
  requireLogisticsPermission(
    "view",
    "invoices"
  ),
  previewLogisticsInvoiceCopy
);


export default router;
