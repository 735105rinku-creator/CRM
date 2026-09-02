import { Router } from "express";
import {
  createLogisticsCustomer,
  getLogisticsCustomers,
  getLogisticsCustomerSummary,
  getLogisticsCustomerById,
  updateLogisticsCustomer,
  deleteLogisticsCustomer,
} from "../controllers/logisticsCustomer.controller.js";

const router = Router();

/*
 * Security is inherited from logistics.routes.js:
 * requireAuth -> requireTenant -> requireLogisticsAccess
 */

router.get("/summary", getLogisticsCustomerSummary);

router
  .route("/")
  .get(
    getLogisticsCustomers
  )
  .post(
    createLogisticsCustomer
  );

router
  .route("/:id")
  .get(
    getLogisticsCustomerById
  )
  .patch(
    updateLogisticsCustomer
  )
  .delete(
    deleteLogisticsCustomer
  );

export default router;