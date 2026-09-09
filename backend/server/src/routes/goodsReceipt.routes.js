import express from "express";

import {
  createGoodsReceipt,
  listGoodsReceipts,
  getGoodsReceiptById,
  getGoodsReceiptsByPurchaseOrder,
  getPurchaseOrderReceiptSummary,
  getGoodsReceiptStatusCounts
} from "../controllers/goodsReceipt.controller.js";


const router =
  express.Router();


/* ============================================================
   STATUS COUNTS
============================================================ */

router.get(
  "/status-counts",
  getGoodsReceiptStatusCounts
);


/* ============================================================
   PURCHASE ORDER GRN HISTORY
============================================================ */

router.get(
  "/purchase-order/:purchaseOrderId",
  getGoodsReceiptsByPurchaseOrder
);


/* ============================================================
   PURCHASE ORDER RECEIPT SUMMARY
============================================================ */

router.get(
  "/purchase-order/:purchaseOrderId/summary",
  getPurchaseOrderReceiptSummary
);


/* ============================================================
   LIST
============================================================ */

router.get(
  "/",
  listGoodsReceipts
);


/* ============================================================
   CREATE
============================================================ */

router.post(
  "/",
  createGoodsReceipt
);

router.get(
  "/:id",
  getGoodsReceiptById
);


export default router;