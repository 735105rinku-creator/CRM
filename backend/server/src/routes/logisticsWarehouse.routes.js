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

const router = Router();

/*
 * Protected by parent logistics.routes.js:
 * requireAuth -> requireTenant -> requireLogisticsAccess
 */

router.get(
  "/summary",
  getLogisticsWarehouseSummary
);

router
  .route("/")
  .get(
    getLogisticsWarehouses
  )
  .post(
    createLogisticsWarehouse
  );

router.post(
  "/:id/receipts",
  addWarehouseReceipt
);

router.patch(
  "/:id/receipts/:receiptId",
  updateWarehouseReceipt
);

router
  .route("/:id")
  .get(
    getLogisticsWarehouseById
  )
  .patch(
    updateLogisticsWarehouse
  )
  .delete(
    deleteLogisticsWarehouse
  );

export default router;