import { Router } from "express";

import { BalanceSheetController } from "../controllers/balanceSheet.controller.js";


const router =
  Router();


const controller =
  new BalanceSheetController();


router.get(
  "/",
  controller.getBalanceSheet
);


export const balanceSheetRouter =
  router;


export default router;
