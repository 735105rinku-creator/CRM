import { Router } from "express";

import {

  listDepartmentInvoices,

  getDepartmentInvoice,

  downloadDepartmentInvoiceDocument,

  verifyDepartmentInvoice,

  rejectDepartmentInvoice,

  payDepartmentInvoice,

  listCompanyAdminApprovals,

  decideCompanyAdminApproval,

} from "../controllers/departmentInvoice.controller.js";

import { ApiError }
  from "../utils/apiError.js";


const router = Router();


/* ============================================================
   ACCOUNTS / FINANCE OPERATIONAL ACCESS

   Important:
   - Company Admin / Super Admin / HR may retain their existing
     company-wide Accounting visibility.
   - That visibility does NOT grant authority to verify,
     reject, or settle Department Invoices.
   - Only an actual Accounts / Finance employee receives
     canOperateDepartmentInvoices from accounting.routes.js.
   - Company Admin final approval is handled separately by
     the controller and is NOT blocked by this middleware.
============================================================ */

const requireDepartmentInvoiceOperator = (
  req,
  res,
  next
) => {

  if (
    req.accountingAccess
      ?.canOperateDepartmentInvoices !==
    true
  ) {

    return next(
      new ApiError(
        403,
        "Only Accounts or Finance department employees can perform this invoice operation."
      )
    );
  }


  return next();
};


/* ============================================================
   DEPARTMENT INVOICES

   Monitoring/list access continues to use the parent
   Accounting authorization.
============================================================ */

router.get(

  "/",

  listDepartmentInvoices

);


/* ============================================================
   COMPANY ADMIN APPROVAL WORKSPACE

   The controller separately allows Company Admin / Super Admin
   to view the approval workspace.

   Final decision remains Company Admin only.
============================================================ */

router.get(

  "/approvals",

  listCompanyAdminApprovals

);


/* ============================================================
   DOCUMENT DOWNLOAD / PREVIEW

   Monitoring users with existing Accounting access may view
   the company-scoped source document.

   Must stay before /:id so the route is explicit and clear.
============================================================ */

router.get(

  "/:id/documents/:index/download",

  downloadDepartmentInvoiceDocument

);


/* ============================================================
   GET SINGLE INVOICE

   Read access continues to use the existing parent Accounting
   authorization and company scoping.
============================================================ */

router.get(

  "/:id",

  getDepartmentInvoice

);


/* ============================================================
   VERIFY

   Accounts / Finance operational employee only.
============================================================ */

router.patch(

  "/:id/verify",

  requireDepartmentInvoiceOperator,

  verifyDepartmentInvoice

);


/* ============================================================
   REJECT

   Accounts / Finance operational employee only.

   This is the Accounts-stage rejection and is intentionally
   separate from Company Admin final authorization rejection.
============================================================ */

router.patch(

  "/:id/reject",

  requireDepartmentInvoiceOperator,

  rejectDepartmentInvoice

);


/* ============================================================
   COMPANY ADMIN FINAL PAYMENT AUTHORIZATION

   Do NOT use requireDepartmentInvoiceOperator here.

   Controller enforces:
     req.user.role === COMPANY_ADMIN

   Service additionally enforces:
     operational status = verified
     company admin status = pending
============================================================ */

router.patch(

  "/:id/company-admin-approval",

  decideCompanyAdminApproval

);


router.post(

  "/:id/payments",

  requireDepartmentInvoiceOperator,

  payDepartmentInvoice

);


export default router;