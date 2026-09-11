import mongoose from "mongoose";

import PurchaseOrder from "../models/PurchaseOrder.js";


/* ============================================================
   HELPERS
============================================================ */

const escapeRegex =
  value =>
    String(
      value || ""
    )
      .replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );


const normalizeSort =
  sort => {

    const allowed =
      new Map([
        [
          "poDate",
          {
            poDate:
              1
          }
        ],

        [
          "-poDate",
          {
            poDate:
              -1
          }
        ],

        [
          "createdAt",
          {
            createdAt:
              1
          }
        ],

        [
          "-createdAt",
          {
            createdAt:
              -1
          }
        ],

        [
          "expectedDeliveryDate",
          {
            expectedDeliveryDate:
              1
          }
        ],

        [
          "-expectedDeliveryDate",
          {
            expectedDeliveryDate:
              -1
          }
        ],

        [
          "grandTotal",
          {
            grandTotal:
              1
          }
        ],

        [
          "-grandTotal",
          {
            grandTotal:
              -1
          }
        ],

        [
          "poNumber",
          {
            poNumber:
              1
          }
        ],

        [
          "-poNumber",
          {
            poNumber:
              -1
          }
        ],

        [
          "vendorName",
          {
            vendorName:
              1
          }
        ],

        [
          "-vendorName",
          {
            vendorName:
              -1
          }
        ]
      ]);


    return (
      allowed.get(
        sort
      ) || {
        poDate:
          -1
      }
    );
  };


/* ============================================================
   REPOSITORY
============================================================ */

class PurchaseOrderRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {

    return PurchaseOrder.create(
      payload
    );
  }


  /* ==========================================================
     FIND BY ID

     Session-aware because GRN create/approval may resolve
     and update the PO inside the same MongoDB transaction.
  ========================================================== */

  async findById(
    companyId,
    purchaseOrderId,
    {
      session = null
    } = {}
  ) {

    const query =
      PurchaseOrder
        .findOne({
          _id:
            purchaseOrderId,

          companyId
        })
        .lean();


    if (
      session
    ) {

      query.session(
        session
      );
    }


    return query;
  }


  /* ==========================================================
     FIND DOCUMENT
  ========================================================== */

  async findDocumentById(
    companyId,
    purchaseOrderId
  ) {

    return PurchaseOrder
      .findOne({
        _id:
          purchaseOrderId,

        companyId
      });
  }


  /* ==========================================================
     FIND BY PO NUMBER
  ========================================================== */

  async findByPoNumber(
    companyId,
    poNumber
  ) {

    return PurchaseOrder
      .findOne({
        companyId,

        poNumber
      })
      .lean();
  }


  /* ==========================================================
     FIND BY QUOTATION
  ========================================================== */

  async findByQuotation(
    companyId,
    quotationId
  ) {

    return PurchaseOrder
      .findOne({
        companyId,

        quotationId
      })
      .lean();
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async list(
    companyId,
    {
      search,
      status,
      vendorId,
      purchaseRequestId,
      quotationId,
      warehouseId,
      from,
      to,
      page = 1,
      limit = 20,
      sort = "-poDate"
    } = {}
  ) {

    const filter = {
      companyId
    };


    if (
      status
    ) {

      filter.status =
        status;
    }


    if (
      vendorId
    ) {

      filter.vendorId =
        vendorId;
    }


    if (
      purchaseRequestId
    ) {

      filter.purchaseRequestId =
        purchaseRequestId;
    }


    if (
      quotationId
    ) {

      filter.quotationId =
        quotationId;
    }


    if (
      warehouseId
    ) {

      filter.warehouseId =
        warehouseId;
    }


    if (
      from ||
      to
    ) {

      filter.poDate =
        {};


      if (
        from
      ) {

        filter.poDate.$gte =
          new Date(
            from
          );
      }


      if (
        to
      ) {

        const toDate =
          new Date(
            to
          );


        toDate.setHours(
          23,
          59,
          59,
          999
        );


        filter.poDate.$lte =
          toDate;
      }

    }


    if (
      search
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            search
          ),
          "i"
        );


      filter.$or = [
        {
          poNumber:
            regex
        },

        {
          purchaseRequestNumber:
            regex
        },

        {
          quotationNumber:
            regex
        },

        {
          rfqNumber:
            regex
        },

        {
          vendorName:
            regex
        },

        {
          vendorCode:
            regex
        },

        {
          warehouseName:
            regex
        },

        {
          deliveryLocationName:
            regex
        },

        {
          "items.itemName":
            regex
        },

        {
          paymentTerms:
            regex
        },

        {
          remarks:
            regex
        }
      ];
    }


    const safePage =
      Math.max(
        1,
        Number(
          page
        ) ||
        1
      );


    const safeLimit =
      Math.min(
        100,
        Math.max(
          1,
          Number(
            limit
          ) ||
          20
        )
      );


    const skip =
      (
        safePage -
        1
      ) *
      safeLimit;


    const [
      rows,
      total
    ] =
      await Promise.all([

        PurchaseOrder
          .find(
            filter
          )
          .sort(
            normalizeSort(
              sort
            )
          )
          .skip(
            skip
          )
          .limit(
            safeLimit
          )
          .lean(),

        PurchaseOrder
          .countDocuments(
            filter
          )

      ]);


    return {
      rows,

      pagination: {
        total,

        page:
          safePage,

        limit:
          safeLimit,

        pages:
          Math.max(
            1,
            Math.ceil(
              total /
              safeLimit
            )
          )
      }
    };
  }


  /* ==========================================================
     UPDATE DRAFT
  ========================================================== */

  async updateDraftById(
    companyId,
    purchaseOrderId,
    payload
  ) {

    return PurchaseOrder
      .findOneAndUpdate(
        {
          _id:
            purchaseOrderId,

          companyId,

          status:
            "draft"
        },

        {
          $set:
            payload
        },

        {
          returnDocument:
            "after",

          runValidators:
            true
        }
      )
      .lean();
  }


  /* ==========================================================
     APPROVE
  ========================================================== */

  async approveById(
    companyId,
    purchaseOrderId,
    approvedBy
  ) {

    return PurchaseOrder
      .findOneAndUpdate(
        {
          _id:
            purchaseOrderId,

          companyId,

          status:
            "draft"
        },

        {
          $set: {
            status:
              "approved",

            approvedAt:
              new Date(),

            approvedBy,

            updatedBy:
              approvedBy
          }
        },

        {
          returnDocument:
            "after",

          runValidators:
            true
        }
      )
      .lean();
  }


  /* ==========================================================
     MARK AS SENT
  ========================================================== */

  async markSentById(
    companyId,
    purchaseOrderId,
    sentBy
  ) {

    return PurchaseOrder
      .findOneAndUpdate(
        {
          _id:
            purchaseOrderId,

          companyId,

          status:
            "approved"
        },

        {
          $set: {
            status:
              "sent",

            sentAt:
              new Date(),

            sentBy,

            updatedBy:
              sentBy
          }
        },

        {
          returnDocument:
            "after",

          runValidators:
            true
        }
      )
      .lean();
  }


  /* ==========================================================
     CANCEL
  ========================================================== */

  async cancelById(
    companyId,
    purchaseOrderId,
    cancelledBy,
    cancellationReason
  ) {

    return PurchaseOrder
      .findOneAndUpdate(
        {
          _id:
            purchaseOrderId,

          companyId,

          status: {
            $in: [
              "draft",
              "approved",
              "sent"
            ]
          }
        },

        {
          $set: {
            status:
              "cancelled",

            cancelledAt:
              new Date(),

            cancelledBy,

            cancellationReason,

            updatedBy:
              cancelledBy
          }
        },

        {
          returnDocument:
            "after",

          runValidators:
            true
        }
      )
      .lean();
  }


  /* ==========================================================
     UPDATE RECEIPT QUANTITIES
     Used by GRN service only.

     Session-aware so:
     - Senior-created auto-approved GRN + PO update
     - Junior GRN approval + PO update

     can commit or rollback together.
  ========================================================== */

  async updateReceiptStateById(
    companyId,
    purchaseOrderId,
    {
      items,
      status,
      updatedBy
    },
    {
      session = null
    } = {}
  ) {

    const query =
      PurchaseOrder
        .findOneAndUpdate(
          {
            _id:
              purchaseOrderId,

            companyId,

            status: {
              $in: [
                "approved",
                "sent",
                "partially_received",
                "received"
              ]
            }
          },

          {
            $set: {
              items,

              status,

              updatedBy
            }
          },

          {
            returnDocument:
              "after",

            runValidators:
              true,

            ...(
              session
                ? {
                    session
                  }
                : {}
            )
          }
        )
        .lean();


    return query;
  }


  /* ==========================================================
     COUNT BY STATUS
  ========================================================== */

  async countByStatus(
    companyId
  ) {

    const scopedCompanyId =
      typeof companyId ===
      "string"
        ? new mongoose.Types.ObjectId(
            companyId
          )
        : companyId;


    const rows =
      await PurchaseOrder.aggregate([
        {
          $match: {
            companyId:
              scopedCompanyId
          }
        },

        {
          $group: {
            _id:
              "$status",

            count: {
              $sum:
                1
            }
          }
        }
      ]);


    const counts = {
      draft:
        0,

      approved:
        0,

      sent:
        0,

      partially_received:
        0,

      received:
        0,

      cancelled:
        0
    };


    for (
      const row
      of rows
    ) {

      if (
        Object.prototype.hasOwnProperty.call(
          counts,
          row._id
        )
      ) {

        counts[
          row._id
        ] =
          row.count;
      }

    }


    return counts;
  }


  /* ==========================================================
     DELIVERY COUNTS
  ========================================================== */

  async countDeliverySummary(
    companyId,
    today = new Date()
  ) {

    const scopedCompanyId =
      typeof companyId ===
      "string"
        ? new mongoose.Types.ObjectId(
            companyId
          )
        : companyId;


    const dayStart =
      new Date(
        today
      );


    dayStart.setHours(
      0,
      0,
      0,
      0
    );


    const rows =
      await PurchaseOrder.aggregate([
        {
          $match: {
            companyId:
              scopedCompanyId,

            status: {
              $in: [
                "approved",
                "sent",
                "partially_received"
              ]
            }
          }
        },

        {
          $group: {
            _id:
              null,

            pendingDeliveries: {
              $sum:
                1
            },

            overdueDeliveries: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: [
                          "$expectedDeliveryDate",
                          null
                        ]
                      },

                      {
                        $lt: [
                          "$expectedDeliveryDate",
                          dayStart
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);


    return (
      rows[0] || {
        pendingDeliveries:
          0,

        overdueDeliveries:
          0
      }
    );
  }


  /* ==========================================================
     PURCHASE REQUEST PO COUNT
  ========================================================== */

  async countForPurchaseRequest(
    companyId,
    purchaseRequestId
  ) {

    return PurchaseOrder
      .countDocuments({
        companyId,

        purchaseRequestId
      });
  }


  /* ==========================================================
     OPEN POs FOR VENDOR
  ========================================================== */

  async findOpenByVendor(
    companyId,
    vendorId
  ) {

    return PurchaseOrder
      .find({
        companyId,

        vendorId,

        status: {
          $in: [
            "approved",
            "sent",
            "partially_received"
          ]
        }
      })
      .sort({
        expectedDeliveryDate:
          1,

        poDate:
          -1
      })
      .lean();
  }


  /* ==========================================================
     OPEN POs FOR WAREHOUSE
  ========================================================== */

  async findOpenByWarehouse(
    companyId,
    warehouseId
  ) {

    return PurchaseOrder
      .find({
        companyId,

        warehouseId,

        status: {
          $in: [
            "approved",
            "sent",
            "partially_received"
          ]
        }
      })
      .sort({
        expectedDeliveryDate:
          1,

        poDate:
          -1
      })
      .lean();
  }

}


export default new PurchaseOrderRepository();