import { Router }
  from "express";

import {
  createLogisticsVendorPayment,
  getLogisticsVendorPayments,
  getLogisticsVendorPaymentSummary,
  getLogisticsVendorPaymentById,
  updateLogisticsVendorPayment,
  addLogisticsVendorPaymentTransaction,
  deleteLogisticsVendorPayment,
} from "../controllers/logisticsVendorPayment.controller.js";

const router =
  Router();

/*
 * Security inherited from parent logistics.routes.js:
 * requireAuth -> requireTenant -> requireLogisticsAccess
 */

router.get(
  "/summary",
  getLogisticsVendorPaymentSummary
);

router
  .route("/")
  .get(
    getLogisticsVendorPayments
  )
  .post(
    createLogisticsVendorPayment
  );

router.post(
  "/:id/payments",
  addLogisticsVendorPaymentTransaction
);

router
  .route("/:id")
  .get(
    getLogisticsVendorPaymentById
  )
  .patch(
    updateLogisticsVendorPayment
  )
  .delete(
    deleteLogisticsVendorPayment
  );

export default router;
