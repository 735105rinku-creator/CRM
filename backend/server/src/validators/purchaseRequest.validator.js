import Joi from "joi";

import {
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_PRIORITIES,
} from "../models/PurchaseRequest.js";


/* ============================================================
   COMMON VALIDATORS
============================================================ */

const objectId =
  Joi.string()
    .hex()
    .length(24);


const optionalText =
  Joi.string()
    .trim()
    .allow(
      "",
      null
    );


/* ============================================================
   CREATE PURCHASE REQUEST

   POST /purchase/requests

   Backend controls:
   - company
   - requester
   - department snapshot
   - PR number
   - workflow status
   - approval/rejection audit
============================================================ */

export const createPurchaseRequestSchema =
  Joi.object({

    requestDate:
      Joi.date()
        .iso()
        .required()
        .messages({

          "date.format":
            "Request date must be a valid ISO date.",

          "any.required":
            "Request date is required.",

        }),


    itemName:
      Joi.string()
        .trim()
        .min(1)
        .max(160)
        .required()
        .messages({

          "string.empty":
            "Item or product name is required.",

          "string.max":
            "Item or product name cannot exceed 160 characters.",

          "any.required":
            "Item or product name is required.",

        }),


    description:
      optionalText
        .max(1000)
        .default(""),


    requiredQuantity:
      Joi.number()
        .positive()
        .precision(4)
        .required()
        .messages({

          "number.base":
            "Required quantity must be a valid number.",

          "number.positive":
            "Required quantity must be greater than zero.",

          "any.required":
            "Required quantity is required.",

        }),


    unit:
      Joi.string()
        .trim()
        .min(1)
        .max(60)
        .required()
        .messages({

          "string.empty":
            "Unit is required.",

          "string.max":
            "Unit cannot exceed 60 characters.",

          "any.required":
            "Unit is required.",

        }),


    requiredDate:
      Joi.date()
        .iso()
        .required()
        .messages({

          "date.format":
            "Required date must be a valid ISO date.",

          "any.required":
            "Required date is required.",

        }),


    purpose:
      Joi.string()
        .trim()
        .min(1)
        .max(1000)
        .required()
        .messages({

          "string.empty":
            "Purpose or justification is required.",

          "string.max":
            "Purpose or justification cannot exceed 1000 characters.",

          "any.required":
            "Purpose or justification is required.",

        }),


    priority:
      Joi.string()
        .valid(
          ...PURCHASE_PRIORITIES
        )
        .default(
          "medium"
        )
        .messages({

          "any.only":
            "Invalid Purchase Request priority.",

        }),


    remarks:
      optionalText
        .max(1500)
        .default(""),


    /* ======================================================
       BACKEND CONTROLLED
    ====================================================== */

    companyId:
      Joi.forbidden(),


    prNumber:
      Joi.forbidden(),


    requestedBy:
      Joi.forbidden(),


    requestedEmployeeCode:
      Joi.forbidden(),


    requestedByName:
      Joi.forbidden(),


    departmentId:
      Joi.forbidden(),


    departmentName:
      Joi.forbidden(),


    departmentCode:
      Joi.forbidden(),


    status:
      Joi.forbidden(),


    submittedAt:
      Joi.forbidden(),


    submittedBy:
      Joi.forbidden(),


    approvedAt:
      Joi.forbidden(),


    approvedBy:
      Joi.forbidden(),


    approvalRemarks:
      Joi.forbidden(),


    rejectedAt:
      Joi.forbidden(),


    rejectedBy:
      Joi.forbidden(),


    rejectionReason:
      Joi.forbidden(),


    createdBy:
      Joi.forbidden(),


    updatedBy:
      Joi.forbidden(),

  });


/* ============================================================
   UPDATE PURCHASE REQUEST

   PUT/PATCH /purchase/requests/:id

   Workflow status is NOT editable here.
   Service/repository will additionally enforce which statuses
   are editable.
============================================================ */

export const updatePurchaseRequestSchema =
  Joi.object({

    requestDate:
      Joi.date()
        .iso(),


    itemName:
      Joi.string()
        .trim()
        .min(1)
        .max(160),


    description:
      optionalText
        .max(1000),


    requiredQuantity:
      Joi.number()
        .positive()
        .precision(4),


    unit:
      Joi.string()
        .trim()
        .min(1)
        .max(60),


    requiredDate:
      Joi.date()
        .iso(),


    purpose:
      Joi.string()
        .trim()
        .min(1)
        .max(1000),


    priority:
      Joi.string()
        .valid(
          ...PURCHASE_PRIORITIES
        ),


    remarks:
      optionalText
        .max(1500),


    /* ======================================================
       IMMUTABLE / BACKEND CONTROLLED
    ====================================================== */

    companyId:
      Joi.forbidden(),


    prNumber:
      Joi.forbidden(),


    requestedBy:
      Joi.forbidden(),


    requestedEmployeeCode:
      Joi.forbidden(),


    requestedByName:
      Joi.forbidden(),


    departmentId:
      Joi.forbidden(),


    departmentName:
      Joi.forbidden(),


    departmentCode:
      Joi.forbidden(),


    status:
      Joi.forbidden(),


    submittedAt:
      Joi.forbidden(),


    submittedBy:
      Joi.forbidden(),


    approvedAt:
      Joi.forbidden(),


    approvedBy:
      Joi.forbidden(),


    approvalRemarks:
      Joi.forbidden(),


    rejectedAt:
      Joi.forbidden(),


    rejectedBy:
      Joi.forbidden(),


    rejectionReason:
      Joi.forbidden(),


    createdBy:
      Joi.forbidden(),


    updatedBy:
      Joi.forbidden(),

  })
    .min(1)
    .messages({

      "object.min":
        "At least one Purchase Request field must be provided for update.",

    });


/* ============================================================
   PURCHASE REQUEST LIST QUERY

   GET /purchase/requests
============================================================ */

export const purchaseRequestQuerySchema =
  Joi.object({

    search:
      optionalText
        .max(160),


    status:
      Joi.string()
        .valid(
          ...PURCHASE_REQUEST_STATUSES
        )
        .allow(
          "",
          null
        ),


    priority:
      Joi.string()
        .valid(
          ...PURCHASE_PRIORITIES
        )
        .allow(
          "",
          null
        ),


    requestedBy:
      objectId
        .allow(
          "",
          null
        ),


    departmentId:
      objectId
        .allow(
          "",
          null
        ),


    from:
      Joi.date()
        .iso()
        .allow(
          "",
          null
        ),


    to:
      Joi.date()
        .iso()
        .allow(
          "",
          null
        ),


    requiredFrom:
      Joi.date()
        .iso()
        .allow(
          "",
          null
        ),


    requiredTo:
      Joi.date()
        .iso()
        .allow(
          "",
          null
        ),


    page:
      Joi.number()
        .integer()
        .min(1)
        .default(1),


    limit:
      Joi.number()
        .integer()
        .min(1)
        .max(200)
        .default(25),


    sortBy:
      Joi.string()
        .valid(
          "prNumber",
          "requestDate",
          "requiredDate",
          "priority",
          "status",
          "itemName",
          "createdAt",
          "updatedAt"
        )
        .default(
          "requestDate"
        ),


    sortOrder:
      Joi.string()
        .valid(
          "asc",
          "desc"
        )
        .default(
          "desc"
        ),

  });


/* ============================================================
   PURCHASE REQUEST ID PARAM
============================================================ */

export const purchaseRequestIdParamSchema =
  Joi.object({

    id:
      objectId
        .required()
        .messages({

          "string.hex":
            "Invalid Purchase Request ID.",

          "string.length":
            "Invalid Purchase Request ID.",

          "any.required":
            "Purchase Request ID is required.",

        }),

  });


/* ============================================================
   SUBMIT FOR APPROVAL

   PATCH /purchase/requests/:id/submit
============================================================ */

export const submitPurchaseRequestSchema =
  Joi.object({

    remarks:
      optionalText
        .max(1500)
        .default(""),

  });


/* ============================================================
   APPROVE PURCHASE REQUEST

   PATCH /purchase/requests/:id/approve
============================================================ */

export const approvePurchaseRequestSchema =
  Joi.object({

    remarks:
      optionalText
        .max(1500)
        .default(""),

  });


/* ============================================================
   REJECT PURCHASE REQUEST

   PATCH /purchase/requests/:id/reject
============================================================ */

export const rejectPurchaseRequestSchema =
  Joi.object({

    rejectionReason:
      Joi.string()
        .trim()
        .min(3)
        .max(1500)
        .required()
        .messages({

          "string.empty":
            "Rejection reason is required.",

          "string.min":
            "Rejection reason must contain at least 3 characters.",

          "string.max":
            "Rejection reason cannot exceed 1500 characters.",

          "any.required":
            "Rejection reason is required.",

        }),

  });


/* ============================================================
   GENERIC STATUS UPDATE

   PATCH /purchase/requests/:id/status

   This endpoint exists only because the current Purchase
   frontend service already exposes it.

   The service layer must still enforce valid workflow
   transitions. Joi only validates that the requested status is
   one of the supported Purchase Request states.
============================================================ */

export const updatePurchaseRequestStatusSchema =
  Joi.object({

    status:
      Joi.string()
        .valid(
          ...PURCHASE_REQUEST_STATUSES
        )
        .required()
        .messages({

          "any.only":
            "Invalid Purchase Request status.",

          "any.required":
            "Purchase Request status is required.",

        }),


    remarks:
      optionalText
        .max(1500)
        .default(""),

  });