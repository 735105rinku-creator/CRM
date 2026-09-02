import { Router } from "express";

import {
  createLogisticsTransporter,
  getLogisticsTransporters,
  getLogisticsTransporterSummary,
  getLogisticsTransporterById,
  updateLogisticsTransporter,
  deleteLogisticsTransporter,
} from "../controllers/logisticsTransporter.controller.js";

const router = Router();

/* Protected by logistics.routes.js */

router.get("/summary", getLogisticsTransporterSummary);

router
  .route("/")
  .get(getLogisticsTransporters)
  .post(createLogisticsTransporter);

router
  .route("/:id")
  .get(getLogisticsTransporterById)
  .patch(updateLogisticsTransporter)
  .delete(deleteLogisticsTransporter);

export default router;