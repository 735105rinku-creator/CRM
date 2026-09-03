import {
  Router,
} from "express";

import {
  createChartOfAccount,
  getChartOfAccounts,
  getChartOfAccountSummary,
  getChartOfAccountById,
  updateChartOfAccount,
} from "../controllers/chartOfAccount.controller.js";


const router =
  Router();


/*
 * IMPORTANT:
 *
 * Authentication, tenant isolation and Accounting/Finance
 * access will be inherited from accounting.routes.js.
 *
 * Do NOT duplicate requireAuth / requireTenant here.
 */


/* ============================================================
   CHART OF ACCOUNTS SUMMARY

   Keep this BEFORE /:id so "summary" is never interpreted
   as an account ID.
============================================================ */

router.get(
  "/summary",
  getChartOfAccountSummary
);


/* ============================================================
   LIST / CREATE
============================================================ */

router
  .route(
    "/"
  )

  .get(
    getChartOfAccounts
  )

  .post(
    createChartOfAccount
  );


/* ============================================================
   DETAIL / UPDATE
============================================================ */

router
  .route(
    "/:id"
  )

  .get(
    getChartOfAccountById
  )

  .patch(
    updateChartOfAccount
  );


export default router;