import { Router } from "express";

import { requireAuth }
  from "../middleware/auth.middleware.js";

import { requireTenant }
  from "../middleware/tenant.middleware.js";

import { requireWarehouseAccess }
  from "../middleware/warehouseAccess.middleware.js";

import {
  createWarehouse,
  getWarehouses,
  getWarehouseSummary,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
} from "../controllers/warehouse.controller.js";

import {
  createWarehouseItem,
  getWarehouseItems,
  getWarehouseItemSummary,
  getWarehouseItemById,
  updateWarehouseItem,
  adjustWarehouseItemQuantity,
  deleteWarehouseItem,
} from "../controllers/warehouseItem.controller.js";

import {
  createWarehouseIncoming,
  getWarehouseIncoming,
  getWarehouseIncomingSummary,
  getWarehouseIncomingById,
  updateWarehouseIncoming,
  markWarehouseIncomingReceived,
  confirmWarehouseIncoming,
  cancelWarehouseIncoming,
  deleteWarehouseIncoming,
} from "../controllers/warehouseIncoming.controller.js";

import {
  createWarehouseOutgoing,
  getWarehouseOutgoing,
  getWarehouseOutgoingSummary,
  getWarehouseOutgoingById,
  updateWarehouseOutgoing,
  dispatchWarehouseOutgoing,
  deliverWarehouseOutgoing,
  cancelWarehouseOutgoing,
  deleteWarehouseOutgoing,
} from "../controllers/warehouseOutgoing.controller.js";

import {
  createWarehouseTransfer,
  getWarehouseTransfers,
  getWarehouseTransferSummary,
  getWarehouseTransferById,
  completeWarehouseTransfer,
  cancelWarehouseTransfer,
  deleteWarehouseTransfer,
} from "../controllers/warehouseTransfer.controller.js";

import {
  createWarehouseDamage,
  getWarehouseDamages,
  getWarehouseDamageSummary,
  getWarehouseDamageById,
  reviewWarehouseDamage,
  approveWarehouseDamage,
  removeWarehouseDamage,
  deleteWarehouseDamage,
} from "../controllers/warehouseDamage.controller.js";

import {
  createWarehouseTask,
  getWarehouseTasks,
  getMyWarehouseTasks,
  getWarehouseTaskSummary,
  getWarehouseTaskById,
  updateWarehouseTask,
  startWarehouseTask,
  completeWarehouseTask,
  cancelWarehouseTask,
  deleteWarehouseTask,
} from "../controllers/warehouseTask.controller.js";

import {
  getWarehouseActivity,
  getWarehouseActivitySummary,
} from "../controllers/warehouseActivity.controller.js";

const router = Router();

router.use(requireAuth);
router.use(requireTenant);
router.use(requireWarehouseAccess);

router.get(
  "/summary",
  getWarehouseSummary
);

router
  .route("/warehouses")
  .get(getWarehouses)
  .post(createWarehouse);

router
  .route("/warehouses/:id")
  .get(getWarehouseById)
  .patch(updateWarehouse)
  .delete(deleteWarehouse);

router.get(
  "/items/summary",
  getWarehouseItemSummary
);

router
  .route("/items")
  .get(getWarehouseItems)
  .post(createWarehouseItem);

router
  .route("/items/:id")
  .get(getWarehouseItemById)
  .patch(updateWarehouseItem)
  .delete(deleteWarehouseItem);

router.patch(
  "/items/:id/quantity",
  adjustWarehouseItemQuantity
);

router.get(
  "/incoming/summary",
  getWarehouseIncomingSummary
);

router
  .route("/incoming")
  .get(getWarehouseIncoming)
  .post(createWarehouseIncoming);

router
  .route("/incoming/:id")
  .get(getWarehouseIncomingById)
  .patch(updateWarehouseIncoming)
  .delete(deleteWarehouseIncoming);

router.post(
  "/incoming/:id/receive",
  markWarehouseIncomingReceived
);

router.post(
  "/incoming/:id/confirm",
  confirmWarehouseIncoming
);

router.post(
  "/incoming/:id/cancel",
  cancelWarehouseIncoming
);

router.get(
  "/outgoing/summary",
  getWarehouseOutgoingSummary
);

router
  .route("/outgoing")
  .get(getWarehouseOutgoing)
  .post(createWarehouseOutgoing);

router
  .route("/outgoing/:id")
  .get(getWarehouseOutgoingById)
  .patch(updateWarehouseOutgoing)
  .delete(deleteWarehouseOutgoing);

router.post(
  "/outgoing/:id/dispatch",
  dispatchWarehouseOutgoing
);

router.post(
  "/outgoing/:id/deliver",
  deliverWarehouseOutgoing
);

router.post(
  "/outgoing/:id/cancel",
  cancelWarehouseOutgoing
);

router.get(
  "/transfers/summary",
  getWarehouseTransferSummary
);

router
  .route("/transfers")
  .get(getWarehouseTransfers)
  .post(createWarehouseTransfer);

router
  .route("/transfers/:id")
  .get(getWarehouseTransferById)
  .delete(deleteWarehouseTransfer);

router.post(
  "/transfers/:id/complete",
  completeWarehouseTransfer
);

router.post(
  "/transfers/:id/cancel",
  cancelWarehouseTransfer
);

router.get(
  "/damages/summary",
  getWarehouseDamageSummary
);

router
  .route("/damages")
  .get(getWarehouseDamages)
  .post(createWarehouseDamage);

router
  .route("/damages/:id")
  .get(getWarehouseDamageById)
  .delete(deleteWarehouseDamage);

router.post(
  "/damages/:id/review",
  reviewWarehouseDamage
);

router.post(
  "/damages/:id/approve",
  approveWarehouseDamage
);

router.post(
  "/damages/:id/remove",
  removeWarehouseDamage
);

router.get(
  "/tasks/summary",
  getWarehouseTaskSummary
);

router.get(
  "/tasks/mine",
  getMyWarehouseTasks
);

router
  .route("/tasks")
  .get(getWarehouseTasks)
  .post(createWarehouseTask);

router
  .route("/tasks/:id")
  .get(getWarehouseTaskById)
  .patch(updateWarehouseTask)
  .delete(deleteWarehouseTask);

router.post(
  "/tasks/:id/start",
  startWarehouseTask
);

router.post(
  "/tasks/:id/complete",
  completeWarehouseTask
);
router.get(
  "/activity/summary",
  getWarehouseActivitySummary
);

router.get(
  "/activity",
  getWarehouseActivity
);

router.post(
  "/tasks/:id/cancel",
  cancelWarehouseTask
);

export default router;