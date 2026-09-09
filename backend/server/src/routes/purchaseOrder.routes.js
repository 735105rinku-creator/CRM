import express from "express";

import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderById,
  getPurchaseOrderDeliverySummary,
  getPurchaseOrderStatusCounts,
  listPurchaseOrders,
  sendPurchaseOrder,
  updatePurchaseOrder
} from "../controllers/purchaseOrder.controller.js";

import {
  ApiError
} from "../utils/apiError.js";


const router =
  express.Router();


/* ============================================================
   PURCHASE SENIOR APPROVAL ACCESS
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
        "Purchase Senior approval access is required."
      )
    );
  };


/* ============================================================
   STATIC ROUTES
   Keep these before /:id
============================================================ */

router.get(
  "/status-counts",
  getPurchaseOrderStatusCounts
);


router.get(
  "/delivery-summary",
  getPurchaseOrderDeliverySummary
);


/* ============================================================
   LIST / CREATE
============================================================ */

router.get(
  "/",
  listPurchaseOrders
);


router.post(
  "/",
  createPurchaseOrder
);


/* ============================================================
   WORKFLOW
============================================================ */

router.patch(
  "/:id/approve",
  requirePurchaseApprovalAccess,
  approvePurchaseOrder
);


router.patch(
  "/:id/send",
  sendPurchaseOrder
);


router.patch(
  "/:id/cancel",
  cancelPurchaseOrder
);


/* ============================================================
   DETAIL / UPDATE
============================================================ */

router.get(
  "/:id",
  getPurchaseOrderById
);


router.put(
  "/:id",
  updatePurchaseOrder
);


export default router;