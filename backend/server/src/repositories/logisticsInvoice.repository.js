import mongoose from "mongoose";
import LogisticsInvoice
  from "../models/LogisticsInvoice.js";


/* ============================================================
   HELPERS
============================================================ */

const escapeRegExp = (
  value = ""
) =>
  String(
    value
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );


/* ============================================================
   CREATOR POPULATION
============================================================ */

const populateCreatorDetails = (
  query
) =>
  query
    .populate({
      path:
        "createdBy",

      select:
        [
          "name",
          "displayName",
          "firstName",
          "lastName",
          "email",
        ].join(
          " "
        ),
    })
    .populate({
      path:
        "createdByEmployeeId",

      select:
        [
          "employeeCode",
          "firstName",
          "lastName",
          "name",
          "displayName",
          "designation",
          "organizationRole",
        ].join(
          " "
        ),
    });


/* ============================================================
   CREATOR OWNERSHIP FILTER

   Used for:
   - junior own-workspace reads
   - creator-only mutations

   Preferred identity:
   createdByEmployeeId

   Legacy fallback:
   createdBy, but only when old record has no employee reference.

   Ownership is wrapped in $and so it does not collide with
   search $or conditions.
============================================================ */

const applyCreatorOwnership = ({
  filter,
  employeeId = null,
  userId = null,
}) => {

  let ownership =
    null;


  if (
    employeeId &&
    userId
  ) {

    ownership = {
      $or: [

        {
          createdByEmployeeId:
            employeeId,
        },

        {
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
                userId,
            },

          ],
        },

      ],
    };

  } else if (
    employeeId
  ) {

    ownership = {
      createdByEmployeeId:
        employeeId,
    };

  } else if (
    userId
  ) {

    ownership = {
      createdBy:
        userId,
    };
  }


  if (
    !ownership
  ) {

    return filter;
  }


  return {
    ...filter,

    $and: [
      ...(
        Array.isArray(
          filter.$and
        )
          ? filter.$and
          : []
      ),

      ownership,
    ],
  };
};


/* ============================================================
   OPTIONAL READ OWNERSHIP

   restrictToOwner = true
      -> junior/executive workspace
      -> only own records

   restrictToOwner = false
      -> senior department review
      -> management monitoring
      -> company-wide Logistics records

   If owner restriction is requested without any usable
   requester identity, fail closed instead of exposing the
   company-wide list.
============================================================ */

const applyReadOwnership = ({
  filter,
  restrictToOwner = false,
  employeeId = null,
  userId = null,
}) => {

  if (
    !restrictToOwner
  ) {

    return filter;
  }


  if (
    !employeeId &&
    !userId
  ) {

    return {
      ...filter,

      _id: {
        $exists:
          false,
      },
    };
  }


  return applyCreatorOwnership({
    filter,
    employeeId,
    userId,
  });
};


/* ============================================================
   REPOSITORY
============================================================ */

class LogisticsInvoiceRepository {


  /* ==========================================================
     CREATE
  ========================================================== */

  create(
    payload
  ) {

    return LogisticsInvoice
      .create(
        payload
      );
  }


  /* ==========================================================
     FIND BY ID

     Optional requester-aware read scope.

     Junior:
       restrictToOwner = true

     Senior / management:
       restrictToOwner = false
  ========================================================== */

  findById({
    companyId,
    invoiceId,
    restrictToOwner = false,
    employeeId = null,
    userId = null,
  }) {

    const filter =
      applyReadOwnership({

        filter: {

          _id:
            invoiceId,

          companyId,

          isActive: {
            $ne:
              false,
          },
        },

        restrictToOwner,

        employeeId,

        userId,
      });


    const query =
      LogisticsInvoice
        .findOne(
          filter
        );


    populateCreatorDetails(
      query
    );


    return query
      .lean();
  }


  /* ==========================================================
     FIND LATEST INVOICE NUMBER
  ========================================================== */

  findLatest({
    companyId,
    prefix,
  }) {

    const safePrefix =
      escapeRegExp(
        prefix
      );


    return LogisticsInvoice
      .findOne({

        companyId,

        invoiceNumber: {
          $regex:
            new RegExp(
              `^${safePrefix}`,
              "i"
            ),
        },
      })
      .sort({
        invoiceNumber:
          -1,
      })
      .select(
        "invoiceNumber"
      )
      .lean();
  }


  /* ==========================================================
     PAGINATE / LIST

     Junior:
       own records only

     Senior:
       department/company Logistics records for review

     Management:
       existing monitoring visibility preserved
  ========================================================== */

  async paginate({
    companyId,
    page = 1,
    limit = 20,
    search = "",
    status = "",
    paymentStatus = "",
    customerId = null,
    shipmentNumber = "",
    fromDate = null,
    toDate = null,
    sortBy = "createdAt",
    sortOrder = "desc",

    restrictToOwner = false,
    employeeId = null,
    userId = null,
  }) {

    const currentPage =
      Math.max(
        Number(
          page
        ) ||
        1,
        1
      );


    const pageLimit =
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


    let filter = {

      companyId,

      isActive: {
        $ne:
          false,
      },
    };


    if (
      status
    ) {

      filter.status =
        status;
    }


    if (
      paymentStatus
    ) {

      filter.paymentStatus =
        paymentStatus;
    }


    if (
      customerId
    ) {

      filter.customerId =
        customerId;
    }


    if (
      shipmentNumber
    ) {

      filter.shipmentNumber =
        String(
          shipmentNumber
        )
          .trim()
          .toUpperCase();
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

        const endDate =
          new Date(
            toDate
          );


        endDate.setHours(
          23,
          59,
          59,
          999
        );


        filter.invoiceDate.$lte =
          endDate;
      }
    }


    if (
      search
    ) {

      const searchPattern =
        new RegExp(
          escapeRegExp(
            search
          ),
          "i"
        );


      filter.$or = [

        {
          invoiceNumber:
            searchPattern,
        },

        {
          customerName:
            searchPattern,
        },

        {
          shipmentNumber:
            searchPattern,
        },

        {
          customerReference:
            searchPattern,
        },

        {
          email:
            searchPattern,
        },

        {
          mobile:
            searchPattern,
        },

      ];
    }


    filter =
      applyReadOwnership({

        filter,

        restrictToOwner,

        employeeId,

        userId,
      });


    const skip =
      (
        currentPage -
        1
      ) *
      pageLimit;


    const sortDirection =
      sortOrder ===
        "asc"
        ? 1
        : -1;


    const dataQuery =
      LogisticsInvoice
        .find(
          filter
        )
        .sort({
          [sortBy]:
            sortDirection,
        })
        .skip(
          skip
        )
        .limit(
          pageLimit
        );


    populateCreatorDetails(
      dataQuery
    );


    const [
      data,
      total,
    ] =
      await Promise.all([

        dataQuery
          .lean(),

        LogisticsInvoice
          .countDocuments(
            filter
          ),

      ]);


    return {

      data,

      pagination: {

        page:
          currentPage,

        limit:
          pageLimit,

        total,

        totalPages:
          Math.ceil(
            total /
            pageLimit
          ),
      },
    };
  }


  /* ==========================================================
     UPDATE

     Creator only + Accounts lock.
  ========================================================== */

  update({
    companyId,
    invoiceId,
    payload,
    auditEntry,
    employeeId = null,
    userId = null,
  }) {

    const filter =
      applyCreatorOwnership({

        filter: {

          _id:
            invoiceId,

          companyId,

          isActive: {
            $ne:
              false,
          },

          accountsHandoffId:
            null,
        },

        employeeId,

        userId,
      });


    const query =
      LogisticsInvoice
        .findOneAndUpdate(
          filter,
          {
            $set:
              payload,

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
          },
          {
            new:
              true,

            runValidators:
              true,
          }
        );


    populateCreatorDetails(
      query
    );


    return query
      .lean();
  }


  /* ==========================================================
     UPDATE INVOICE COPY

     Creator only + Accounts lock.
  ========================================================== */

  updateInvoiceCopy({
    companyId,
    invoiceId,
    invoiceCopy,
    updatedBy,
    employeeId = null,
    userId = null,
    auditEntry = null,
  }) {

    const filter =
      applyCreatorOwnership({

        filter: {

          _id:
            invoiceId,

          companyId,

          isActive: {
            $ne:
              false,
          },

          accountsHandoffId:
            null,
        },

        employeeId,

        userId,
      });


    const query =
      LogisticsInvoice
        .findOneAndUpdate(
          filter,
          {
            $set: {

              invoiceCopy,

              updatedBy,
            },

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
          },
          {
            new:
              true,

            runValidators:
              true,
          }
        );


    populateCreatorDetails(
      query
    );


    return query
      .lean();
  }


  /* ==========================================================
     SOFT DELETE

     Creator only + Accounts lock.
  ========================================================== */

  softDelete({
    companyId,
    invoiceId,
    userId,
    employeeId = null,
    auditEntry = null,
  }) {

    const filter =
      applyCreatorOwnership({

        filter: {

          _id:
            invoiceId,

          companyId,

          isActive: {
            $ne:
              false,
          },

          accountsHandoffId:
            null,
        },

        employeeId,

        userId,
      });


    const query =
      LogisticsInvoice
        .findOneAndUpdate(
          filter,
          {
            $set: {

              isActive:
                false,

              updatedBy:
                userId,
            },

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
          },
          {
            new:
              true,

            runValidators:
              true,
          }
        );


    populateCreatorDetails(
      query
    );


    return query
      .lean();
  }


  /* ==========================================================
     SUMMARY

     Same visibility rule as list:

     Junior:
       own records only

     Senior / management:
       company Logistics summary
  ========================================================== */

  summary({
    companyId,
    restrictToOwner = false,
    employeeId = null,
    userId = null,
  }) {

    let match = {

      companyId:

        companyId instanceof
          mongoose.Types.ObjectId
          ? companyId
          : new mongoose.Types.ObjectId(
              String(
                companyId
              )
            ),

      isActive: {
        $ne:
          false,
      },
    };


    match =
      applyReadOwnership({

        filter:
          match,

        restrictToOwner,

        employeeId:
          employeeId
            ? (
                employeeId instanceof
                  mongoose.Types.ObjectId
                  ? employeeId
                  : new mongoose.Types.ObjectId(
                      String(
                        employeeId
                      )
                    )
              )
            : null,

        userId:
          userId
            ? (
                userId instanceof
                  mongoose.Types.ObjectId
                  ? userId
                  : new mongoose.Types.ObjectId(
                      String(
                        userId
                      )
                    )
              )
            : null,
      });


    return LogisticsInvoice
      .aggregate([
        {
          $match:
            match,
        },

        {
          $group: {

            _id:
              null,

            totalInvoices: {
              $sum:
                1,
            },

            totalBilled: {
              $sum:
                "$invoiceTotal",
            },

            totalReceived: {
              $sum:
                "$amountReceived",
            },

            totalOutstanding: {
              $sum:
                "$balanceDue",
            },

            draft: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "draft",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            issued: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "issued",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

          },
        },
      ]);
  }

}


export default new LogisticsInvoiceRepository();