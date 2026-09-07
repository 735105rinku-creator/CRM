import { Router } from "express";

import { ProfitLossController } from "../controllers/profitLoss.controller.js";


const router =
  Router();


const controller =
  new ProfitLossController();


router.get(
  "/",
  controller.getProfitLoss
);


export const profitLossRouter =
  router;


export default router;
