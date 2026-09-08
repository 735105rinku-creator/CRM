import { Router } from "express";

import {
  createLogisticsWarehouse,
  getLogisticsWarehouses,
  getLogisticsWarehouseSummary,
  getLogisticsWarehouseById,
  updateLogisticsWarehouse,
  addWarehouseReceipt,
  updateWarehouseReceipt,
  deleteLogisticsWarehouse,
} from "../controllers/logisticsWarehouse.controller.js";
import { requireLogisticsPermission } from "../middleware/logisticsPermission.middleware.js";

const router = Router();

/*
 * Protected by parent logistics.routes.js:
 * requireAuth -> requireTenant -> requireLogisticsAccess
 */

router.get(
  "/summary",
  requireLogisticsPermission("view", "warehouse"),
  getLogisticsWarehouseSummary
);

router
  .route("/")
  .get(
    requireLogisticsPermission("view", "warehouse"),
    getLogisticsWarehouses
  )
  .post(
    requireLogisticsPermission("create", "warehouse"),
    createLogisticsWarehouse
  );

router.post(
  "/:id/receipts",
  requireLogisticsPermission("create", "warehouse"),
  addWarehouseReceipt
);

router.patch(
  "/:id/receipts/:receiptId",
  requireLogisticsPermission("edit", "warehouse"),
  updateWarehouseReceipt
);

router
  .route("/:id")
  .get(
    requireLogisticsPermission("view", "warehouse"),
    getLogisticsWarehouseById
  )
  .patch(
    requireLogisticsPermission("edit", "warehouse"),
    updateLogisticsWarehouse
  )
  .delete(
    requireLogisticsPermission("delete", "warehouse"),
    deleteLogisticsWarehouse
  );

export default router;
