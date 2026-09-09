import mongoose from "mongoose";


export const PURCHASE_REQUEST_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
];


export const PURCHASE_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
];


/* ============================================================
   PURCHASE REQUEST SCHEMA
============================================================ */

const purchaseRequestSchema =
  new mongoose.Schema(
    {

      /* ======================================================
         COMPANY / TENANT
      ====================================================== */

      companyId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Company",

        required:
          true,
      },


      /* ======================================================
         REQUEST IDENTITY
      ====================================================== */

      prNumber: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        maxlength:
          80,

        immutable:
          true,
      },


      requestDate: {
        type:
          Date,

        required:
          true,
      },


      /* ======================================================
         REQUESTED BY

         User/employee identity is determined by the backend.
         The frontend must never choose another requester by
         manually supplying a MongoDB ObjectId.
      ====================================================== */

      requestedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      requestedEmployeeCode: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        maxlength:
          80,

        default:
          "",
      },


      requestedByName: {
        type:
          String,

        trim:
          true,

        maxlength:
          180,

        default:
          "",
      },


      /* ======================================================
         REQUESTING DEPARTMENT SNAPSHOT

         Keep a readable snapshot so historical Purchase
         Requests remain understandable even if department
         display information changes later.
      ====================================================== */

      departmentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Department",

        default:
          null,
      },


      departmentName: {
        type:
          String,

        trim:
          true,

        maxlength:
          160,

        default:
          "",
      },


      departmentCode: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        maxlength:
          80,

        default:
          "",
      },


      /* ======================================================
         ITEM
      ====================================================== */

      itemName: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          160,
      },


      description: {
        type:
          String,

        trim:
          true,

        maxlength:
          1000,

        default:
          "",
      },


      requiredQuantity: {
        type:
          Number,

        required:
          true,

        min:
          0.0001,
      },


      unit: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          60,
      },


      requiredDate: {
        type:
          Date,

        required:
          true,
      },


      /* ======================================================
         BUSINESS REQUIREMENT
      ====================================================== */

      purpose: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          1000,
      },


      priority: {
        type:
          String,

        enum:
          PURCHASE_PRIORITIES,

        default:
          "medium",
      },


      remarks: {
        type:
          String,

        trim:
          true,

        maxlength:
          1500,

        default:
          "",
      },


      /* ======================================================
         WORKFLOW
      ====================================================== */

      status: {
        type:
          String,

        enum:
          PURCHASE_REQUEST_STATUSES,

        default:
          "draft",
      },


      submittedAt: {
        type:
          Date,

        default:
          null,
      },


      submittedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      approvedAt: {
        type:
          Date,

        default:
          null,
      },


      approvedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      approvalRemarks: {
        type:
          String,

        trim:
          true,

        maxlength:
          1500,

        default:
          "",
      },


      rejectedAt: {
        type:
          Date,

        default:
          null,
      },


      rejectedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      rejectionReason: {
        type:
          String,

        trim:
          true,

        maxlength:
          1500,

        default:
          "",
      },


      /* ======================================================
         AUDIT
      ====================================================== */

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

    },

    {

      timestamps:
        true,

      versionKey:
        false,


      /*
       * IMPORTANT:
       *
       * Merely importing this model must not create a
       * collection or build indexes.
       *
       * This follows the existing accounting model pattern
       * and respects the project's no-database-touch rule.
       */

      autoCreate:
        false,

      autoIndex:
        false,


      collection:
        "purchase_requests",

    }
  );


/* ============================================================
   BASIC MODEL VALIDATION

   Complex workflow/access rules stay in the service and
   repository layers.

   IMPORTANT:
   This validation middleware uses synchronous middleware style.
   It does not depend on callback-style next().
============================================================ */

purchaseRequestSchema.pre(
  "validate",

  function validatePurchaseRequest() {

    const quantity =
      Number(
        this.requiredQuantity
      );


    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity <= 0
    ) {

      throw new Error(
        "Required quantity must be greater than zero."
      );
    }


    if (
      this.requestDate &&
      Number.isNaN(
        new Date(
          this.requestDate
        ).getTime()
      )
    ) {

      throw new Error(
        "Invalid Purchase Request date."
      );
    }


    if (
      this.requiredDate &&
      Number.isNaN(
        new Date(
          this.requiredDate
        ).getTime()
      )
    ) {

      throw new Error(
        "Invalid required date."
      );
    }

  }
);


/* ============================================================
   INDEX DEFINITIONS

   autoIndex=false means these definitions are NOT built merely
   because the backend starts.
============================================================ */

/*
 * PR Number must be unique inside one company.
 */

purchaseRequestSchema.index(
  {
    companyId:
      1,

    prNumber:
      1,
  },

  {
    unique:
      true,

    name:
      "company_purchase_request_number_unique",
  }
);


/*
 * Main Purchase Request listing.
 */

purchaseRequestSchema.index(
  {
    companyId:
      1,

    requestDate:
      -1,

    status:
      1,
  },

  {
    name:
      "company_purchase_request_listing",
  }
);


/*
 * Approval queue.
 */

purchaseRequestSchema.index(
  {
    companyId:
      1,

    status:
      1,

    priority:
      1,

    requiredDate:
      1,
  },

  {
    name:
      "company_purchase_request_approval_queue",
  }
);


/*
 * Employee/requester history.
 */

purchaseRequestSchema.index(
  {
    companyId:
      1,

    requestedBy:
      1,

    createdAt:
      -1,
  },

  {
    name:
      "company_purchase_request_requester",
  }
);


/*
 * Employee-code lookup remains useful where the existing HR
 * architecture identifies employees by employeeCode.
 */

purchaseRequestSchema.index(
  {
    companyId:
      1,

    requestedEmployeeCode:
      1,

    createdAt:
      -1,
  },

  {
    name:
      "company_purchase_request_employee_code",
  }
);


/* ============================================================
   MODEL
============================================================ */

const PurchaseRequest =
  mongoose.models
    .PurchaseRequest ||
  mongoose.model(
    "PurchaseRequest",
    purchaseRequestSchema
  );


export default
  PurchaseRequest;