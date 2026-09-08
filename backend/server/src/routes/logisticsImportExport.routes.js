import { Router } from "express";

import {
  downloadImportTemplate,
  importLogisticsData,
  exportLogisticsData,
} from "../controllers/logisticsImportExport.controller.js";

import {
  logisticsImportFile,
} from "../middleware/logisticsImportExport.middleware.js";
import { requireLogisticsPermission } from "../middleware/logisticsPermission.middleware.js";

const router =
  Router();



router.get(
  "/template/:module",
  requireLogisticsPermission("view", "productsServices"),
  downloadImportTemplate
);

router.get(
  "/export/:module",
  requireLogisticsPermission("export", "reports"),
  exportLogisticsData
);

router.post(
  "/import/:module",
  requireLogisticsPermission("create", "productsServices"),
  logisticsImportFile,
  importLogisticsData
);

export default router;
