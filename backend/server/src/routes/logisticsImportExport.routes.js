import { Router } from "express";

import {
  downloadImportTemplate,
  importLogisticsData,
  exportLogisticsData,
} from "../controllers/logisticsImportExport.controller.js";

import {
  logisticsImportFile,
} from "../middleware/logisticsImportExport.middleware.js";

const router =
  Router();



router.get(
  "/template/:module",
  downloadImportTemplate
);

router.get(
  "/export/:module",
  exportLogisticsData
);

router.post(
  "/import/:module",
  logisticsImportFile,
  importLogisticsData
);

export default router;
