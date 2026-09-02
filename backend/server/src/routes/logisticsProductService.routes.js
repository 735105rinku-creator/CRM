import { Router }
  from "express";

import {
  createLogisticsProductService,
  getLogisticsProductServices,
  getLogisticsProductServiceSummary,
  getLogisticsProductServiceById,
  updateLogisticsProductService,
  deleteLogisticsProductService,
} from "../controllers/logisticsProductService.controller.js";

const router =
  Router();

/*
 * Security inherited from parent logistics.routes.js
 */

router.get(
  "/summary",
  getLogisticsProductServiceSummary
);

router
  .route("/")
  .get(
    getLogisticsProductServices
  )
  .post(
    createLogisticsProductService
  );

router
  .route("/:id")
  .get(
    getLogisticsProductServiceById
  )
  .patch(
    updateLogisticsProductService
  )
  .delete(
    deleteLogisticsProductService
  );

export default router;
