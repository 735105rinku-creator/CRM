import mongoose from "mongoose";

import LogisticsVendorPayment
  from "../models/LogisticsVendorPayment.js";


/* ============================================================
   HELPERS
============================================================ */

function escapeRegex(
  value
) {

  return String(
    value ||
    ""
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
}


/* ============================================================
   OBJECT ID HELPER
============================================================ */

function toObjectId(
  value
) {

  if (
    !value
  ) {

    return null;
  }


  if (
    value instanceof
    mongoose.Types.ObjectId
  ) {

    return value;
  }


  if (
    !mongoose.Types.ObjectId
      .isValid(
        String(
          value
        )
      )
  ) {

    return null;
  }


  return new mongoose.Types.ObjectId(
    String(
      value
    )
  );
}


/* ============================================================
   CREATOR POPULATION

   Purpose:
   - Senior can see who created a Vendor Payment.
   - Creator information is read-only context.
   - It does NOT give Senior edit permission.
============================================================ */

function populateCreatorDetails(
  query
) {

  return query
    .populate(
      "createdBy",
      "name displayName firstName lastName email"
    )
    .populate(
      "createdByEmployeeId",
      "employeeCode firstName lastName name displayName designation organizationRole"
    );
}


/* ============================================================
   MUTATION OWNERSHIP FILTER

   employeeId is the primary ownership identity.

   createdBy/userId is only a LEGACY fallback when the record
   does not have createdByEmployeeId.

   This distinction is important.

   Without the legacy null/missing check, an employee could
   theoretically match another modern record through createdBy.

   Senior Accounts handoff intentionally does not use these
   creator-only mutation methods.
============================================================ */

function applyCreatorOwnership({

  filter,

  employeeId = null,

  userId = null,

}) {

  const employeeObjectId =
    toObjectId(
      employeeId
    );


  const userObjectId =
    toObjectId(
      userId
    );


  if (
    employeeObjectId
  ) {

    const ownershipConditions = [

      {
        createdByEmployeeId:
          employeeObjectId,
      },

    ];


    if (
      userObjectId
    ) {

      ownershipConditions.push({

        $and: [

          {

            $or: [

              {
                createdByEmployeeId:
                  null,
              },

              {
                createdByEmployeeId: {
                  $exists:
                    false,
                },
              },

            ],

          },

          {
            createdBy:
              userObjectId,
          },

        ],

      });

    }


    filter.$and = [

      ...(
        Array.isArray(
          filter.$and
        )
          ? filter.$and
          : []
      ),

      {
        $or:
          ownershipConditions,
      },

    ];


    return filter;
  }


  if (
    userObjectId
  ) {

    filter.createdBy =
      userObjectId;

    return filter;
  }


  /*
   * Fail closed.
   *
   * A creator-only mutation without a usable identity must
   * never become a company-wide mutation.
   */

  filter._id = {
    $in: [],
  };


  return filter;
}


/* ============================================================
   READ OWNERSHIP FILTER

   restrictToOwner = true
   --------------------------------
   Normal Logistics employee:
   - sees own Vendor Payments only
   - modern ownership uses createdByEmployeeId
   - legacy records fall back to createdBy

   restrictToOwner = false
   --------------------------------
   Logistics Senior / authorized management:
   - can review department records
   - creator population tells them who owns the record
   - this does NOT grant mutation authority

   Missing identity while owner restriction is required:
   - fail closed
   - return no records
============================================================ */

function applyReadOwnership({

  filter,

  restrictToOwner = false,

  employeeId = null,

  userId = null,

}) {

  if (
    !restrictToOwner
  ) {

    return filter;
  }


  const employeeObjectId =
    toObjectId(
      employeeId
    );


  const userObjectId =
    toObjectId(
      userId
    );


  if (
    employeeObjectId
  ) {

    const ownershipConditions = [

      {
        createdByEmployeeId:
          employeeObjectId,
      },

    ];


    if (
      userObjectId
    ) {

      ownershipConditions.push({

        $and: [

          {

            $or: [

              {
                createdByEmployeeId:
                  null,
              },

              {
                createdByEmployeeId: {
                  $exists:
                    false,
                },
              },

            ],

          },

          {
            createdBy:
              userObjectId,
          },

        ],

      });

    }


    filter.$and = [

      ...(
        Array.isArray(
          filter.$and
        )
          ? filter.$and
          : []
      ),

      {
        $or:
          ownershipConditions,
      },

    ];


    return filter;
  }


  if (
    userObjectId
  ) {

    filter.createdBy =
      userObjectId;

    return filter;
  }


  /*
   * Fail closed if the employee should be owner-scoped but
   * authentication context does not contain a usable identity.
   */

  filter._id = {
    $in: [],
  };


  return filter;
}


/* ============================================================
   REPOSITORY
============================================================ */

class LogisticsVendorPaymentRepository {


  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {

    return LogisticsVendorPayment
      .create(
        payload
      );
  }


  /* ==========================================================
     FIND BY ID

     Read visibility is requester-aware.

     Junior/executive:
     - own record only

     Senior/management:
     - department review visibility

     Company isolation is always mandatory.
  ========================================================== */

  async findById({

    companyId,

    paymentId,

    restrictToOwner = false,

    employeeId = null,

    userId = null,

  }) {

    const filter = {

      _id:
        paymentId,

      companyId,

      isActive: {
        $ne:
          false,
      },

    };


    applyReadOwnership({

      filter,

      restrictToOwner,

      employeeId,

      userId,

    });


    const query =
      LogisticsVendorPayment
        .findOne(
          filter
        )
        .populate(
          "vendorId",
          "vendorCode vendorName companyName mobile email"
        )
        .populate(
          "shipmentId",
          "shipmentNumber shipmentMode customerName status"
        );


    populateCreatorDetails(
      query
    );


    return query
      .lean();
  }


  /* ==========================================================
     PAGINATE

     Requester-aware workspace visibility:

     Normal employee:
     - only own Vendor Payments

     Logistics Senior / management:
     - department/company review visibility

     Mutation authority remains separate.
  ========================================================== */

  async paginate({

    companyId,

    page = 1,

    limit = 20,

    search = "",

    vendorId = null,

    status = "",

    fromDate = null,

    toDate = null,

    sortBy = "createdAt",

    sortOrder = "desc",

    restrictToOwner = false,

    employeeId = null,

    userId = null,

  }) {

    const filter = {

      companyId,

      isActive: {
        $ne:
          false,
      },

    };


    applyReadOwnership({

      filter,

      restrictToOwner,

      employeeId,

      userId,

    });


    if (
      vendorId
    ) {

      filter.vendorId =
        vendorId;
    }


    if (
      status
    ) {

      filter.status =
        status;
    }


    if (
      fromDate ||
      toDate
    ) {

      filter.invoiceDate =
        {};


      if (
        fromDate
      ) {

        filter.invoiceDate.$gte =
          new Date(
            fromDate
          );
      }


      if (
        toDate
      ) {

        const end =
          new Date(
            toDate
          );


        end.setHours(
          23,
          59,
          59,
          999
        );


        filter.invoiceDate.$lte =
          end;
      }

    }


    const q =
      String(
        search ||
        ""
      )
        .trim();


    if (
      q
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            q
          ),
          "i"
        );


      filter.$or = [

        {
          paymentCode:
            regex,
        },

        {
          vendor:
            regex,
        },

        {
          exportInvoiceNo:
            regex,
        },

        {
          vendorInvoiceNo:
            regex,
        },

        {
          from:
            regex,
        },

        {
          shipmentNumber:
            regex,
        },

        {
          remarks:
            regex,
        },

      ];
    }


    const safePage =
      Math.max(
        Number(
          page
        ) ||
        1,
        1
      );


    const safeLimit =
      Math.min(
        Math.max(
          Number(
            limit
          ) ||
          20,
          1
        ),
        100
      );


    const allowedSort =
      new Set([

        "createdAt",

        "updatedAt",

        "paymentCode",

        "invoiceDate",

        "vendorInvoiceDate",

        "totalAmount",

        "pendingAmount",

        "supplierBalance",

        "status",

      ]);


    const field =
      allowedSort.has(
        sortBy
      )
        ? sortBy
        : "createdAt";


    const direction =
      sortOrder ===
        "asc"
        ? 1
        : -1;


    const dataQuery =
      LogisticsVendorPayment
        .find(
          filter
        )
        .populate(
          "vendorId",
          "vendorCode vendorName companyName"
        )
        .sort({
          [field]:
            direction,
        })
        .skip(
          (
            safePage -
            1
          ) *
          safeLimit
        )
        .limit(
          safeLimit
        );


    populateCreatorDetails(
      dataQuery
    );


    const [
      data,
      total
    ] =
      await Promise.all([

        dataQuery
          .lean(),

        LogisticsVendorPayment
          .countDocuments(
            filter
          ),

      ]);


    const totalPages =
      Math.max(
        Math.ceil(
          total /
          safeLimit
        ),
        1
      );


    return {

      data,

      pagination: {

        page:
          safePage,

        limit:
          safeLimit,

        total,

        totalPages,

        hasNextPage:
          safePage <
          totalPages,

        hasPreviousPage:
          safePage >
          1,

      },

    };
  }


  /* ==========================================================
     UPDATE RECORD

     Locks:

     1. Accounts lock
        accountsHandoffId must be null.

     2. Workspace ownership
        only creator may modify.

     createdByEmployeeId is preferred.

     createdBy is only used for legacy records that do not have
     createdByEmployeeId.
  ========================================================== */

  async updateById({

    companyId,

    paymentId,

    payload,

    auditEntry,

    employeeId = null,

    userId = null,

  }) {

    const filter = {

      _id:
        paymentId,

      companyId,

      isActive: {
        $ne:
          false,
      },

      accountsHandoffId:
        null,

    };


    applyCreatorOwnership({

      filter,

      employeeId,

      userId,

    });


    return LogisticsVendorPayment
      .findOneAndUpdate(

        filter,

        {

          ...(
            auditEntry
              ? {
                  $push: {
                    editHistory:
                      auditEntry,
                  },
                }
              : {}
          ),

          $set:
            payload,

        },

        {

          new:
            true,

          runValidators:
            true,

        }

      );
  }


  /* ==========================================================
     ADD LOGISTICS PAYMENT

     Existing direct Logistics payment remains available only:

     - before Accounts handoff
     - to the creator

     Senior review/handoff does not grant direct payment rights
     over a junior-created Vendor Payment.
  ========================================================== */

  async addPaymentTransaction({

    companyId,

    paymentId,

    transaction,

    amount,

    userId,

    employeeId = null,

  }) {

    const filter = {

      _id:
        paymentId,

      companyId,

      isActive: {
        $ne:
          false,
      },

      accountsHandoffId:
        null,

    };


    applyCreatorOwnership({

      filter,

      employeeId,

      userId,

    });


    return LogisticsVendorPayment
      .findOneAndUpdate(

        filter,

        {

          $push: {

            paymentHistory:
              transaction,

          },

          $inc: {

            paidAmount:
              Number(
                amount ||
                0
              ),

          },

          $set: {

            updatedBy:
              userId,

          },

        },

        {

          new:
            true,

          runValidators:
            true,

        }

      );
  }


  /* ==========================================================
     SOFT DELETE

     Creator only.
     Accounts handoff locks deletion.
  ========================================================== */

  async softDelete({

    companyId,

    paymentId,

    userId,

    employeeId = null,

  }) {

    const filter = {

      _id:
        paymentId,

      companyId,

      isActive: {
        $ne:
          false,
      },

      accountsHandoffId:
        null,

    };


    applyCreatorOwnership({

      filter,

      employeeId,

      userId,

    });


    return LogisticsVendorPayment
      .findOneAndUpdate(

        filter,

        {

          $set: {

            isActive:
              false,

            updatedBy:
              userId,

          },

        },

        {

          new:
            true,

        }

      )
      .lean();
  }


  /* ==========================================================
     SUMMARY

     Summary now follows the exact same read scope as the list.

     Junior:
     - summary represents only their workspace.

     Senior / management:
     - department overview.

     This prevents a junior dashboard from leaking aggregate
     totals belonging to other Logistics employees.
  ========================================================== */

  async summary({

    companyId,

    restrictToOwner = false,

    employeeId = null,

    userId = null,

  }) {

    const filter = {

      companyId,

      isActive: {
        $ne:
          false,
      },

    };


    applyReadOwnership({

      filter,

      restrictToOwner,

      employeeId,

      userId,

    });


    /*
     * Aggregation requires actual ObjectId values.
     *
     * companyId may already be an ObjectId depending on the
     * authentication/company middleware. Convert only when safe.
     */

    const companyObjectId =
      toObjectId(
        companyId
      );


    if (
      companyObjectId
    ) {

      filter.companyId =
        companyObjectId;
    }


    return LogisticsVendorPayment
      .aggregate([

        {

          $match:
            filter,

        },

        {

          $group: {

            _id:
              "$status",

            count: {
              $sum:
                1,
            },

            totalAmount: {
              $sum:
                "$totalAmount",
            },

            previousAdvance: {
              $sum:
                "$previousAdvance",
            },

            paidAmount: {
              $sum:
                "$paidAmount",
            },

            deduction: {
              $sum:
                "$deduction",
            },

            pendingAmount: {
              $sum:
                "$pendingAmount",
            },

            supplierBalance: {
              $sum:
                "$supplierBalance",
            },

          },

        },

      ]);
  }


  /* ==========================================================
     NEXT SERIAL NUMBER

     IMPORTANT:
     Number generation remains COMPANY scoped.

     It must NOT become employee scoped because payment codes /
     serial numbers must remain unique across the company.
  ========================================================== */

  async nextSerialNumber(
    companyId
  ) {

    const latest =
      await LogisticsVendorPayment
        .findOne({

          companyId,

          isActive: {
            $ne:
              false,
          },

        })
        .sort({
          serialNumber:
            -1,
        })
        .select(
          "serialNumber"
        )
        .lean();


    return Number(
      latest?.serialNumber ||
      0
    ) + 1;
  }


  /* ==========================================================
     LATEST PAYMENT CODE

     Intentionally company scoped for unique code generation.
  ========================================================== */

  async latestCode({

    companyId,

    dateCode,

  }) {

    return LogisticsVendorPayment
      .findOne({

        companyId,

        paymentCode: {

          $regex:
            new RegExp(
              `^VPM-${dateCode}-`,
              "i"
            ),

        },

      })
      .sort({

        paymentCode:
          -1,

      })
      .select(
        "paymentCode"
      )
      .lean();
  }


  /* ==========================================================
     CODE EXISTS

     Intentionally company scoped.
  ========================================================== */

  async codeExists({

    companyId,

    paymentCode,

  }) {

    return LogisticsVendorPayment
      .exists({

        companyId,

        paymentCode,

      });
  }

}


/* ============================================================
   EXPORT
============================================================ */

export const
  logisticsVendorPaymentRepository =
    new LogisticsVendorPaymentRepository();


export default
  logisticsVendorPaymentRepository;