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

const router = Router();

/*
 * SECURITY NOTE:
 * This child router is mounted under logistics.routes.js,
 * which already applies:
 * requireAuth -> requireTenant -> requireLogisticsAccess
 */

router.get(
  "/summary",
  getLogisticsChaSummary
);

router
  .route("/")
  .get(getLogisticsChaCases)
  .post(createLogisticsCha);

router.patch(
  "/:id/status",
  updateLogisticsChaStatus
);

router
  .route("/:id")
  .get(getLogisticsChaById)
  .patch(updateLogisticsCha)
  .delete(deleteLogisticsCha);

export default router;