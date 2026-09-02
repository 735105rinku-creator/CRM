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
  uploadSingleLogisticsDocument,
} from "../middleware/logisticsDocumentUpload.middleware.js";

import {
  uploadLogisticsDocument,

  getLogisticsDocuments,

  getLogisticsDocumentSummary,

  getLogisticsDocumentById,

  updateLogisticsDocument,

  deleteLogisticsDocument,

  previewLogisticsDocument,

  downloadLogisticsDocument,
} from "../controllers/logisticsDocument.controller.js";


const router =
  Router();


/* ============================================================
   SECURITY
============================================================ */

router.use(
  requireAuth
);

router.use(
  requireTenant
);

router.use(
  requireLogisticsAccess
);


/* ============================================================
   SUMMARY
============================================================ */

router.get(
  "/summary",
  getLogisticsDocumentSummary
);


/* ============================================================
   LIST + UPLOAD
============================================================ */

router
  .route(
    "/"
  )

  .get(
    getLogisticsDocuments
  )

  .post(
    uploadSingleLogisticsDocument,
    uploadLogisticsDocument
  );


/* ============================================================
   PREVIEW / DOWNLOAD

   Keep these before /:id.
============================================================ */

router.get(
  "/:id/preview",
  previewLogisticsDocument
);


router.get(
  "/:id/download",
  downloadLogisticsDocument
);


/* ============================================================
   ONE DOCUMENT
============================================================ */

router
  .route(
    "/:id"
  )

  .get(
    getLogisticsDocumentById
  )

  .patch(
    updateLogisticsDocument
  )

  .delete(
    deleteLogisticsDocument
  );


export default router;