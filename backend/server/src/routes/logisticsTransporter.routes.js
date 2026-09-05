import { Router } from "express";

import {
  createLogisticsTransporter,
  getLogisticsTransporters,
  getLogisticsTransporterSummary,
  getLogisticsTransporterById,
  updateLogisticsTransporter,
  deleteLogisticsTransporter,
} from "../controllers/logisticsTransporter.controller.js";
import { requireLogisticsPermission } from "../middleware/logisticsPermission.middleware.js";

const router = Router();

/* Protected by logistics.routes.js */

router.get("/summary", requireLogisticsPermission("view", "transporters"), getLogisticsTransporterSummary);

router
  .route("/")
  .get(requireLogisticsPermission("view", "transporters"), getLogisticsTransporters)
  .post(requireLogisticsPermission("create", "transporters"), createLogisticsTransporter);

router
  .route("/:id")
  .get(requireLogisticsPermission("view", "transporters"), getLogisticsTransporterById)
  .patch(requireLogisticsPermission("edit", "transporters"), updateLogisticsTransporter)
  .delete(requireLogisticsPermission("delete", "transporters"), deleteLogisticsTransporter);

export default router;
