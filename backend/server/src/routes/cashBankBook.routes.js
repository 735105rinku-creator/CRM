import { Router } from "express";

import { CashBankBookController } from "../controllers/cashBankBook.controller.js";


const router =
  Router();


const controller =
  new CashBankBookController();


router.get(
  "/",
  controller.getCashBankBook
);


export const cashBankBookRouter =
  router;


export default router;
