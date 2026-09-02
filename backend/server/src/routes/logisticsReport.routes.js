import { Router } from "express";
import { getLogisticsReport, exportLogisticsReportCsv } from "../controllers/logisticsReport.controller.js";

const router = Router();

router.get("/export.csv", exportLogisticsReportCsv);
router.get("/", getLogisticsReport);
export default router;
