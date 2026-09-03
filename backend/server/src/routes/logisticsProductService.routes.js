import { Router } from "express";

import {
  createLogisticsProductService,
  getLogisticsProductServices,
  getLogisticsProductServiceSummary,
  getLogisticsProductServiceById,
  updateLogisticsProductService,
  deleteLogisticsProductService,
} from "../controllers/logisticsProductService.controller.js";

import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";


const router = Router();


/*
 * Security inherited from parent logistics.routes.js:
 *
 * requireAuth
 *   ->
 * requireTenant
 *   ->
 * requireLogisticsAccess
 *
 * Action-level authorization is enforced below.
 */


/* ============================================================
   PRODUCT / SERVICE SUMMARY
============================================================ */

router.get(
  "/summary",
  requireLogisticsPermission(
    "view",
    "productsServices"
  ),
  getLogisticsProductServiceSummary
);


/* ============================================================
   PRODUCT / SERVICE LIST / CREATE
============================================================ */

router
  .route("/")
  .get(
    requireLogisticsPermission(
      "view",
      "productsServices"
    ),
    getLogisticsProductServices
  )
  .post(
    requireLogisticsPermission(
      "create",
      "productsServices"
    ),
    createLogisticsProductService
  );


/* ============================================================
   PRODUCT / SERVICE DETAIL / UPDATE / DELETE
============================================================ */

router
  .route("/:id")
  .get(
    requireLogisticsPermission(
      "view",
      "productsServices"
    ),
    getLogisticsProductServiceById
  )
  .patch(
    requireLogisticsPermission(
      "edit",
      "productsServices"
    ),
    updateLogisticsProductService
  )
  .delete(
    requireLogisticsPermission(
      "delete",
      "productsServices"
    ),
    deleteLogisticsProductService
  );


export default router;