import { Router } from "express";

import { asyncHandler } from "../utils/asyncHandler.js";
import { getGstReport } from "../controllers/gstReport.controller.js";


const router =
  Router();


router.get(
  "/",
  asyncHandler(
    getGstReport
  )
);


export default router;
