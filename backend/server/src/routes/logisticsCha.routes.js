import { Router } from "express";

import {
  createLogisticsCha,
  getLogisticsChaCases,
  getLogisticsChaSummary,
  getLogisticsChaById,
  updateLogisticsCha,
  updateLogisticsChaStatus,
  deleteLogisticsCha,
} from "../controllers/logisticsCha.controller.js";

import {
  createLogisticsChaMaster,
  getLogisticsChaMasters,
  getLogisticsChaMasterById,
  updateLogisticsChaMaster,
  updateLogisticsChaMasterStatus,
  deleteLogisticsChaMaster,
} from "../controllers/logisticsChaMaster.controller.js";
import {
  requireLogisticsPermission,
} from "../middleware/logisticsPermission.middleware.js";

const router = Router();

/*
 * SECURITY NOTE:
 * This child router is mounted under logistics.routes.js,
 * which already applies:
 * requireAuth -> requireTenant -> requireLogisticsAccess
 */

router.get(
  "/summary",
  requireLogisticsPermission("view", "cha"),
  getLogisticsChaSummary
);

/* ============================================================
   CHA MASTER
   Uses CHA permissions while keeping the generic Vendors API protected.
============================================================ */

router
  .route("/masters")
  .get(
    requireLogisticsPermission("view", "cha"),
    getLogisticsChaMasters
  )
  .post(
    requireLogisticsPermission("create", "cha"),
    createLogisticsChaMaster
  );

router.patch(
  "/masters/:id/status",
  requireLogisticsPermission("updateStatus", "cha"),
  updateLogisticsChaMasterStatus
);

router
  .route("/masters/:id")
  .get(
    requireLogisticsPermission("view", "cha"),
    getLogisticsChaMasterById
  )
  .patch(
    requireLogisticsPermission("edit", "cha"),
    updateLogisticsChaMaster
  )
  .delete(
    requireLogisticsPermission("delete", "cha"),
    deleteLogisticsChaMaster
  );

router
  .route("/")
  .get(requireLogisticsPermission("view", "cha"), getLogisticsChaCases)
  .post(requireLogisticsPermission("create", "cha"), createLogisticsCha);

router.patch(
  "/:id/status",
  requireLogisticsPermission("updateStatus", "cha"),
  updateLogisticsChaStatus
);

router
  .route("/:id")
  .get(requireLogisticsPermission("view", "cha"), getLogisticsChaById)
  .patch(requireLogisticsPermission("edit", "cha"), updateLogisticsCha)
  .delete(requireLogisticsPermission("delete", "cha"), deleteLogisticsCha);

export default router;
