import { Router } from "express";

import { TrialBalanceController } from "../controllers/trialBalance.controller.js";


const router =
  Router();


const controller =
  new TrialBalanceController();


router.get(
  "/",
  controller.getTrialBalance
);


export const trialBalanceRouter =
  router;


export default router;
