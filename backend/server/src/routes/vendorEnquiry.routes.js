import express from "express";

import {
  createVendorEnquiry,
  getVendorEnquiries,
  getVendorEnquiryStatusCounts,
  getVendorEnquiryById,
  updateVendorEnquiry,
  requestVendorEnquiry,
  receiveVendorEnquiry,
  updateVendorEnquiryStatus,
} from "../controllers/vendorEnquiry.controller.js";

import { ApiError }
  from "../utils/apiError.js";


const router =
  express.Router();


/* ============================================================
   HELPERS
============================================================ */

const requirePurchaseAccess = (
  req,
  _res,
  next
) => {

  if (
    !req.purchaseAccess
      ?.companyId
  ) {

    return next(
      new ApiError(
        403,
        "Purchase access is required."
      )
    );
  }


  next();
};


/*
 * Some future RFQ actions may need Purchase Senior-only access.
 * Keeping this helper here lets us use the existing
 * organizationRole-based Purchase permission model without
 * creating a new role.
 */
const requirePurchaseApprovalAccess = (
  req,
  _res,
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
        "Only an authorized Purchase senior can perform this action."
      )
    );
  }


  next();
};


/* ============================================================
   COMMON ACCESS
============================================================ */

router.use(
  requirePurchaseAccess
);


/* ============================================================
   LIST / CREATE
============================================================ */

router.get(
  "/",
  getVendorEnquiries
);


router.post(
  "/",
  createVendorEnquiry
);


/* ============================================================
   STATUS COUNTS
   IMPORTANT: keep before /:id
============================================================ */

router.get(
  "/status-counts",
  getVendorEnquiryStatusCounts
);


/* ============================================================
   WORKFLOW
============================================================ */

/*
 * Draft -> Requested
 *
 * Normal Purchase employees can prepare and send an RFQ.
 */
router.patch(
  "/:id/request",
  requestVendorEnquiry
);


/*
 * Requested -> Received
 *
 * This records the quotation received from the vendor.
 * It does NOT approve/select the quotation.
 *
 * Quotation selection/approval will be handled separately
 * in the Purchase Quotation module with Purchase Senior
 * permission enforcement.
 */
router.patch(
  "/:id/receive",
  receiveVendorEnquiry
);


/*
 * Generic status endpoint.
 *
 * Service layer still owns the legal transition matrix.
 *
 * Senior approval is intentionally NOT used here because
 * Vendor Enquiry itself is operational communication.
 * Selection/approval belongs to the Quotation workflow.
 */
router.patch(
  "/:id/status",
  updateVendorEnquiryStatus
);


/* ============================================================
   DETAIL / EDIT
============================================================ */

router.get(
  "/:id",
  getVendorEnquiryById
);


router.put(
  "/:id",
  updateVendorEnquiry
);


/* ============================================================
   EXPORT
============================================================ */

export default router;