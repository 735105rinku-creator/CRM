import {
  Router,
} from "express";

import {
  getGeneralLedger,
  getAccountLedger,
} from "../controllers/generalLedger.controller.js";


const router =
  Router();


/* =========================================================
   GENERAL LEDGER LIST

   GET
   /accounting/general-ledger
========================================================= */

router.get(
  "/",
  getGeneralLedger
);


/* =========================================================
   ACCOUNT-WISE LEDGER

   GET
   /accounting/general-ledger/:accountId
========================================================= */

router.get(
  "/:accountId",
  getAccountLedger
);


export default router;