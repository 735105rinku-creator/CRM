import mongoose from "mongoose";

import GoodsReceipt from "../models/GoodsReceipt.js";


/* ============================================================
   HELPERS
============================================================ */

const escapeRegex = (
  value = ""
) =>
  String(
    value
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );


const SORT_MAP = {

  receiptDate: {
    receiptDate: 1,
    _id: 1
  },

  "-receiptDate": {
    receiptDate: -1,
    _id: -1
  },

  createdAt: {
    createdAt: 1,
    _id: 1
  },

  "-createdAt": {
    createdAt: -1,
    _id: -1
  },

  grnNumber: {
    grnNumber: 1,
    _id: 1
  },

  "-grnNumber": {
    grnNumber: -1,
    _id: -1
  },

  poNumber: {
    poNumber: 1,
    _id: 1
  },

  "-poNumber": {
    poNumber: -1,
    _id: -1
  },

  vendorName: {
    vendorName: 1,
    _id: 1
  },

  "-vendorName": {
    vendorName: -1,
    _id: -1
  }

};


const objectId = (
  value
) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(
        value
      );


/*
 * Creator ownership is intentionally optional.
 *
 * The service layer decides:
 *
 * Junior:
 *   creator scope is supplied.
 *
 * Senior Team Work:
 *   creator scope is omitted.
 *
 * Senior My Work:
 *   creator scope is supplied.
 *
 * Both Employee ownership and legacy User ownership are
 * supported so older GRNs remain visible to their creator.
 */
const applyCreatorScope = (
  query,
  {
    creatorEmployeeId = null,
    creatorUserId = null
  } = {},
  {
    convertToObjectId = false
  } = {}
) => {

  if (
    !creatorEmployeeId &&
    !creatorUserId
  ) {

    return query;
  }


  const ownershipConditions =
    [];


  if (
    creatorEmployeeId
  ) {

    ownershipConditions.push({
      createdByEmployeeId:
        convertToObjectId
          ? objectId(
              creatorEmployeeId
            )
          : creatorEmployeeId
    });
  }


  if (
    creatorUserId
  ) {

    ownershipConditions.push({
      createdBy:
        convertToObjectId
          ? objectId(
              creatorUserId
            )
          : creatorUserId
    });
  }


  if (
    ownershipConditions.length >
    0
  ) {

    if (
      Array.isArray(
        query.$and
      )
    ) {

      query.$and.push({
        $or:
          ownershipConditions
      });

    } else {

      query.$and = [
        {
          $or:
            ownershipConditions
        }
      ];
    }
  }


  return query;
};


/* ============================================================
   REPOSITORY
============================================================ */

class GoodsReceiptRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    data,
    {
      session = null
    } = {}
  ) {

    const documents =
      await GoodsReceipt.create(
        [
          data
        ],
        session
          ? {
              session
            }
          : undefined
      );


    return documents[0];
  }


  /* ==========================================================
     FIND BY ID

     Optional creator scope is used for Junior / My Work access.
  ========================================================== */

  async findById(
    companyId,
    id,
    {
      session = null,
      creatorEmployeeId = null,
      creatorUserId = null
    } = {}
  ) {

    const filter = {
      _id:
        id,

      companyId:
        companyId
    };


    applyCreatorScope(
      filter,
      {
        creatorEmployeeId,
        creatorUserId
      }
    );


    const query =
      GoodsReceipt
        .findOne(
          filter
        )
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
     FIND DOCUMENT BY ID
     Used when a Mongoose document is required.

     This remains company scoped by default.
  ========================================================== */

  async findDocumentById(
    companyId,
    id,
    {
      session = null
    } = {}
  ) {

    const query =
      GoodsReceipt
        .findOne({
          _id:
            id,

          companyId:
            companyId
        });


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
     FIND BY GRN NUMBER
  ========================================================== */

  async findByGrnNumber(
    companyId,
    grnNumber,
    {
      session = null
    } = {}
  ) {

    const query =
      GoodsReceipt
        .findOne({
          companyId,
          grnNumber
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
     LIST
  ========================================================== */

  async list(
    companyId,
    filters = {}
  ) {

    const {

      search = "",

      status,

      purchaseOrderId,

      vendorId,

      warehouseId,

      approvalStatus,

      creatorEmployeeId,

      creatorUserId,

      from,

      to,

      page = 1,

      limit = 20,

      sort =
        "-receiptDate"

    } =
      filters;


    const query = {
      companyId
    };


    applyCreatorScope(
      query,
      {
        creatorEmployeeId,
        creatorUserId
      }
    );


    if (
      approvalStatus
    ) {

      query.approvalStatus =
        approvalStatus;
    }


    /* --------------------------------------------------------
       SEARCH
    --------------------------------------------------------- */

    if (
      String(
        search ||
        ""
      )
        .trim()
    ) {

      const safeSearch =
        escapeRegex(
          String(
            search
          )
            .trim()
        );


      const regex =
        new RegExp(
          safeSearch,
          "i"
        );


      const searchConditions = [

        {
          grnNumber:
            regex
        },

        {
          poNumber:
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
          warehouseCode:
            regex
        },

        {
          deliveryChallanNumber:
            regex
        },

        {
          "items.itemName":
            regex
        }

      ];


      if (
        Array.isArray(
          query.$and
        )
      ) {

        query.$and.push({
          $or:
            searchConditions
        });

      } else {

        query.$and = [
          {
            $or:
              searchConditions
          }
        ];
      }
    }


    /* --------------------------------------------------------
       STATUS
    --------------------------------------------------------- */

    if (
      status
    ) {

      query.status =
        status;
    }


    /* --------------------------------------------------------
       PURCHASE ORDER
    --------------------------------------------------------- */

    if (
      purchaseOrderId
    ) {

      query.purchaseOrderId =
        purchaseOrderId;
    }


    /* --------------------------------------------------------
       VENDOR
    --------------------------------------------------------- */

    if (
      vendorId
    ) {

      query.vendorId =
        vendorId;
    }


    /* --------------------------------------------------------
       WAREHOUSE
    --------------------------------------------------------- */

    if (
      warehouseId
    ) {

      query.warehouseId =
        warehouseId;
    }


    /* --------------------------------------------------------
       RECEIPT DATE
    --------------------------------------------------------- */

    if (
      from ||
      to
    ) {

      query.receiptDate = {};


      if (
        from
      ) {

        query.receiptDate.$gte =
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


        query.receiptDate.$lte =
          toDate;
      }
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


    const skip =
      (
        safePage -
        1
      ) *
      safeLimit;


    const sortOption =
      SORT_MAP[
        sort
      ] ||
      SORT_MAP[
        "-receiptDate"
      ];


    const [
      rows,
      total
    ] =
      await Promise.all([

        GoodsReceipt
          .find(
            query
          )
          .sort(
            sortOption
          )
          .skip(
            skip
          )
          .limit(
            safeLimit
          )
          .lean(),

        GoodsReceipt
          .countDocuments(
            query
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
            Math.ceil(
              total /
              safeLimit
            ),
            1
          )

      }

    };
  }


  /* ==========================================================
     FIND ALL GRNs FOR A PO

     Optional creator scope:
     - Junior -> own GRNs
     - Senior Team -> all Purchase GRNs
     - Senior My Work -> own GRNs
  ========================================================== */

  async findByPurchaseOrder(
    companyId,
    purchaseOrderId,
    {
      session = null,
      creatorEmployeeId = null,
      creatorUserId = null
    } = {}
  ) {

    const filter = {
      companyId,
      purchaseOrderId
    };


    applyCreatorScope(
      filter,
      {
        creatorEmployeeId,
        creatorUserId
      }
    );


    const query =
      GoodsReceipt
        .find(
          filter
        )
        .sort({
          receiptDate:
            1,

          createdAt:
            1,

          _id:
            1
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
     FIND LATEST GRN FOR PO
  ========================================================== */

  async findLatestByPurchaseOrder(
    companyId,
    purchaseOrderId,
    {
      session = null
    } = {}
  ) {

    const query =
      GoodsReceipt
        .findOne({
          companyId,
          purchaseOrderId
        })
        .sort({
          receiptDate:
            -1,

          createdAt:
            -1,

          _id:
            -1
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
     AGGREGATE RECEIVED QUANTITY BY PO ITEM

     Important:
     - Current GRN quantity only.
     - Company scoped.
     - Multiple GRNs are aggregated.
     - Pending GRNs can optionally reserve quantity.
     - Rejected approval records never reserve quantity.
  ========================================================== */

  async aggregateReceivedByPurchaseOrder(
    companyId,
    purchaseOrderId,
    {
      session = null,
      includePending = false
    } = {}
  ) {

    const pipeline = [

      {
        $match: {
          companyId:
            objectId(
              companyId
            ),

          purchaseOrderId:
            objectId(
              purchaseOrderId
            ),

          ...(
            includePending
              ? {
                  approvalStatus: {
                    $ne:
                      "rejected"
                  }
                }
              : {
                  $or: [
                    {
                      approvalStatus:
                        "approved"
                    },
                    {
                      approvalStatus: {
                        $exists:
                          false
                      }
                    },
                    {
                      approvalStatus:
                        null
                    }
                  ]
                }
          )
        }
      },

      {
        $unwind:
          "$items"
      },

      {
        $group: {

          _id:
            "$items.purchaseOrderItemId",

          receivedQuantity: {
            $sum:
              "$items.currentReceivedQuantity"
          },

          acceptedQuantity: {
            $sum:
              "$items.acceptedQuantity"
          },

          rejectedQuantity: {
            $sum:
              "$items.rejectedQuantity"
          }

        }
      },

      {
        $project: {

          _id:
            0,

          purchaseOrderItemId:
            "$_id",

          receivedQuantity:
            1,

          acceptedQuantity:
            1,

          rejectedQuantity:
            1

        }
      }

    ];


    const aggregate =
      GoodsReceipt.aggregate(
        pipeline
      );


    if (
      session
    ) {

      aggregate.session(
        session
      );
    }


    return aggregate;
  }


  /* ==========================================================
     COUNT BY STATUS

     Optional creator scope is used for Junior / My Work counts.
  ========================================================== */

  async countByStatus(
    companyId,
    {
      creatorEmployeeId = null,
      creatorUserId = null
    } = {}
  ) {

    const match = {
      companyId:
        objectId(
          companyId
        )
    };


    applyCreatorScope(
      match,
      {
        creatorEmployeeId,
        creatorUserId
      },
      {
        convertToObjectId:
          true
      }
    );


    const rows =
      await GoodsReceipt.aggregate([

        {
          $match:
            match
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

      received:
        0,

      partial:
        0,

      rejected:
        0,

      completed:
        0

    };


    for (
      const row
      of rows
    ) {

      if (
        Object.prototype
          .hasOwnProperty
          .call(
            counts,
            row._id
          )
      ) {

        counts[
          row._id
        ] =
          Number(
            row.count ||
            0
          );
      }
    }


    return counts;
  }


  /* ==========================================================
     APPROVE PENDING GRN
  ========================================================== */

  async approvePendingById(
    companyId,
    id,
    data,
    {
      session = null
    } = {}
  ) {

    return GoodsReceipt
      .findOneAndUpdate(
        {
          _id:
            id,

          companyId,

          approvalStatus:
            "pending_approval"
        },
        {
          $set:
            data
        },
        {
          new:
            true,

          session
        }
      )
      .lean();
  }


  /* ==========================================================
     REJECT PENDING GRN
  ========================================================== */

  async rejectPendingById(
    companyId,
    id,
    data,
    {
      session = null
    } = {}
  ) {

    return GoodsReceipt
      .findOneAndUpdate(
        {
          _id:
            id,

          companyId,

          approvalStatus:
            "pending_approval"
        },
        {
          $set:
            data
        },
        {
          new:
            true,

          session
        }
      )
      .lean();
  }


  /* ==========================================================
     COUNT FOR PURCHASE ORDER

     Intentionally company/PO scoped.
     This is an operational PO count, not My Work count.
  ========================================================== */

  async countForPurchaseOrder(
    companyId,
    purchaseOrderId,
    {
      session = null
    } = {}
  ) {

    const query =
      GoodsReceipt
        .countDocuments({
          companyId,
          purchaseOrderId
        });


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
     DELIVERY CHALLAN DUPLICATE CHECK

     Blank challan numbers are intentionally ignored.
  ========================================================== */

  async findByDeliveryChallan(
    companyId,
    vendorId,
    deliveryChallanNumber,
    {
      session = null
    } = {}
  ) {

    const challanNumber =
      String(
        deliveryChallanNumber ||
        ""
      )
        .trim();


    if (
      !challanNumber
    ) {

      return null;
    }


    const query =
      GoodsReceipt
        .findOne({

          companyId,

          vendorId,

          deliveryChallanNumber: {
            $regex:
              `^${escapeRegex(
                challanNumber
              )}$`,

            $options:
              "i"
          }

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
     TOTAL CURRENT RECEIPT QUANTITY FOR PO

     Kept unchanged for backward compatibility.
     Approval-aware operational calculations use
     aggregateReceivedByPurchaseOrder().
  ========================================================== */

  async totalReceivedQuantityForPurchaseOrder(
    companyId,
    purchaseOrderId,
    {
      session = null
    } = {}
  ) {

    const pipeline = [

      {
        $match: {

          companyId:
            objectId(
              companyId
            ),

          purchaseOrderId:
            objectId(
              purchaseOrderId
            )

        }
      },

      {
        $unwind:
          "$items"
      },

      {
        $group: {

          _id:
            null,

          receivedQuantity: {
            $sum:
              "$items.currentReceivedQuantity"
          },

          acceptedQuantity: {
            $sum:
              "$items.acceptedQuantity"
          },

          rejectedQuantity: {
            $sum:
              "$items.rejectedQuantity"
          }

        }
      },

      {
        $project: {

          _id:
            0,

          receivedQuantity:
            1,

          acceptedQuantity:
            1,

          rejectedQuantity:
            1

        }
      }

    ];


    const aggregate =
      GoodsReceipt.aggregate(
        pipeline
      );


    if (
      session
    ) {

      aggregate.session(
        session
      );
    }


    const rows =
      await aggregate;


    return rows[0] || {

      receivedQuantity:
        0,

      acceptedQuantity:
        0,

      rejectedQuantity:
        0

    };
  }

}


const goodsReceiptRepository =
  new GoodsReceiptRepository();


export {
  GoodsReceiptRepository
};


export default goodsReceiptRepository;