import { Router } from "express";
import {
  createLogisticsVendor,
  getLogisticsVendors,
  getLogisticsVendorSummary,
  getLogisticsVendorById,
  updateLogisticsVendor,
  deleteLogisticsVendor,
} from "../controllers/logisticsVendor.controller.js";

const router = Router();

/* Security inherited from logistics.routes.js:
   requireAuth -> requireTenant -> requireLogisticsAccess */

router.get("/summary", getLogisticsVendorSummary);

router.route("/")
  .get(getLogisticsVendors)
  .post(createLogisticsVendor);

router.route("/:id")
  .get(getLogisticsVendorById)
  .patch(updateLogisticsVendor)
  .delete(deleteLogisticsVendor);

export default router;
