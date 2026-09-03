import { Router } from "express";

import {
  createLogisticsCustomer,
  getLogisticsCustomers,
  getLogisticsCustomerSummary,
  getLogisticsCustomerById,
  updateLogisticsCustomer,
  deleteLogisticsCustomer,
} from "../controllers/logisticsCustomer.controller.js";

import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";


const router = Router();


/*
 * Security inherited from logistics.routes.js:
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
   CUSTOMER SUMMARY
============================================================ */

router.get(
  "/summary",
  requireLogisticsPermission(
    "view",
    "customers"
  ),
  getLogisticsCustomerSummary
);


/* ============================================================
   CUSTOMER LIST / CREATE
============================================================ */

router
  .route("/")
  .get(
    requireLogisticsPermission(
      "view",
      "customers"
    ),
    getLogisticsCustomers
  )
  .post(
    requireLogisticsPermission(
      "create",
      "customers"
    ),
    createLogisticsCustomer
  );


/* ============================================================
   CUSTOMER DETAIL / UPDATE / DELETE
============================================================ */

router
  .route("/:id")
  .get(
    requireLogisticsPermission(
      "view",
      "customers"
    ),
    getLogisticsCustomerById
  )
  .patch(
    requireLogisticsPermission(
      "edit",
      "customers"
    ),
    updateLogisticsCustomer
  )
  .delete(
    requireLogisticsPermission(
      "delete",
      "customers"
    ),
    deleteLogisticsCustomer
  );


export default router;