import express from "express";

import {
  createPurchaseRequest,
  getPurchaseRequests,
  getPurchaseRequestById,
  updatePurchaseRequest,
  submitPurchaseRequest,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  updatePurchaseRequestStatus,
  getPurchaseRequestStatusCounts,
} from "../controllers/purchaseRequest.controller.js";

import {
  ApiError
} from "../utils/apiError.js";


const router =
  express.Router();


/* ============================================================
   APPROVAL GUARD

   Purchase Request approval/rejection is allowed only when the
   parent Purchase access resolver has granted canApprove=true.

   Normal Purchase employee:
   - create ✅
   - edit draft ✅
   - submit ✅
   - approve ❌
   - reject ❌

   Purchase senior:
   - approve ✅
   - reject ✅
============================================================ */

const requirePurchaseApprovalAccess =
  (
    req,
    res,
    next
  ) => {

    if (
      req.purchaseAccess
        ?.canApprove !==
      true
    ) {

      return next(
        new ApiError(
          403,
          "Only an authorized Purchase senior can approve or reject purchase requests."
        )
      );
    }


    return next();
  };


/* ============================================================
   LIST / CREATE
============================================================ */

router.get(
  "/",
  getPurchaseRequests
);


router.post(
  "/",
  createPurchaseRequest
);


/* ============================================================
   SUMMARY

   IMPORTANT:
   Keep before /:id route.
============================================================ */

router.get(
  "/status-counts",
  getPurchaseRequestStatusCounts
);


/* ============================================================
   WORKFLOW
============================================================ */

/*
 * Draft -> Pending Approval
 *
 * Normal Purchase employee may submit their Purchase Request.
 */

router.patch(
  "/:id/submit",
  submitPurchaseRequest
);


/*
 * Pending Approval -> Approved
 *
 * Purchase senior only.
 */

router.patch(
  "/:id/approve",
  requirePurchaseApprovalAccess,
  approvePurchaseRequest
);


/*
 * Pending Approval -> Rejected
 *
 * Purchase senior only.
 */

router.patch(
  "/:id/reject",
  requirePurchaseApprovalAccess,
  rejectPurchaseRequest
);


/* ============================================================
   GENERIC STATUS UPDATE

   Existing frontend service currently has:
   PATCH /:id/status

   We preserve the route for compatibility.

   IMPORTANT:
   Approval/rejection through this generic endpoint must also
   be protected. Therefore authorization is decided below.
============================================================ */

router.patch(
  "/:id/status",
  (
    req,
    res,
    next
  ) => {

    const requestedStatus =
      String(
        req.body?.status ||
        ""
      )
        .trim()
        .toLowerCase();


    /*
     * Approval/rejection through generic status route
     * requires Purchase senior authorization.
     */

    if (
      requestedStatus ===
        "approved" ||
      requestedStatus ===
        "rejected"
    ) {

      return requirePurchaseApprovalAccess(
        req,
        res,
        next
      );
    }


    return next();
  },
  updatePurchaseRequestStatus
);


/* ============================================================
   SINGLE RECORD
============================================================ */

router.get(
  "/:id",
  getPurchaseRequestById
);



router.put(
  "/:id",
  updatePurchaseRequest
);


export default
  router;