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
   BASE SECURITY
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

  requireLogisticsPermission(
    "view",
    "documents"
  ),

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

    requireLogisticsPermission(
      "view",
      "documents"
    ),

    getLogisticsDocuments
  )

  .post(

    /*
     * Permission check MUST run before Multer.
     *
     * Unauthorized users should never be allowed
     * to write a temporary physical file.
     */
    requireLogisticsPermission(
      "create",
      "documents"
    ),

    uploadSingleLogisticsDocument,

    uploadLogisticsDocument
  );


/* ============================================================
   PREVIEW / DOWNLOAD

   Keep these before /:id.
============================================================ */

router.get(
  "/:id/preview",

  requireLogisticsPermission(
    "view",
    "documents"
  ),

  previewLogisticsDocument
);


router.get(
  "/:id/download",

  requireLogisticsPermission(
    "view",
    "documents"
  ),

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

    requireLogisticsPermission(
      "view",
      "documents"
    ),

    getLogisticsDocumentById
  )

  .patch(

    requireLogisticsPermission(
      "edit",
      "documents"
    ),

    updateLogisticsDocument
  )

  .delete(

    requireLogisticsPermission(
      "delete",
      "documents"
    ),

    deleteLogisticsDocument
  );


export default router;