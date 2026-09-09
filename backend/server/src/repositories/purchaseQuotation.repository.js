import PurchaseQuotation from "../models/PurchaseQuotation.js";


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
          "quotationDate",
          {
            quotationDate:
              1
          }
        ],

        [
          "-quotationDate",
          {
            quotationDate:
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
          "quotationNumber",
          {
            quotationNumber:
              1
          }
        ],

        [
          "-quotationNumber",
          {
            quotationNumber:
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
        quotationDate:
          -1
      }
    );
  };


/* ============================================================
   REPOSITORY
============================================================ */

class PurchaseQuotationRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {

    return PurchaseQuotation.create(
      payload
    );
  }


  /* ==========================================================
     FIND BY ID
  ========================================================== */

  async findById(
    companyId,
    quotationId
  ) {

    return PurchaseQuotation
      .findOne({
        _id:
          quotationId,

        companyId
      })
      .lean();
  }


  /* ==========================================================
     FIND DOCUMENT BY ID
     Used when service needs an editable mongoose document.
  ========================================================== */

  async findDocumentById(
    companyId,
    quotationId
  ) {

    return PurchaseQuotation
      .findOne({
        _id:
          quotationId,

        companyId
      });
  }


  /* ==========================================================
     FIND BY NUMBER
  ========================================================== */

  async findByQuotationNumber(
    companyId,
    quotationNumber
  ) {

    return PurchaseQuotation
      .findOne({
        companyId,

        quotationNumber
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
      vendorEnquiryId,
      from,
      to,
      page = 1,
      limit = 20,
      sort = "-quotationDate"
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
      vendorEnquiryId
    ) {

      filter.vendorEnquiryId =
        vendorEnquiryId;
    }


    if (
      from ||
      to
    ) {

      filter.quotationDate =
        {};


      if (
        from
      ) {

        filter
          .quotationDate
          .$gte =
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


        filter
          .quotationDate
          .$lte =
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
          "items.itemName":
            regex
        },

        {
          deliveryTime:
            regex
        },

        {
          paymentTerms:
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

        PurchaseQuotation
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

        PurchaseQuotation
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
     UPDATE EDITABLE QUOTATION
  ========================================================== */

  async updateEditableById(
    companyId,
    quotationId,
    payload,
    allowedStatuses = [
      "requested",
      "received"
    ]
  ) {

    return PurchaseQuotation
      .findOneAndUpdate(
        {
          _id:
            quotationId,

          companyId,

          status: {
            $in:
              allowedStatuses
          }
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
     CHANGE OPERATIONAL STATUS
  ========================================================== */

  async transitionOperationalStatusById(
    companyId,
    quotationId,
    fromStatuses,
    toStatus,
    updatedBy
  ) {

    return PurchaseQuotation
      .findOneAndUpdate(
        {
          _id:
            quotationId,

          companyId,

          status: {
            $in:
              fromStatuses
          }
        },

        {
          $set: {
            status:
              toStatus,

            updatedBy
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
     SELECT QUOTATION
  ========================================================== */

  async selectById(
    companyId,
    quotationId,
    selectedBy
  ) {

    return PurchaseQuotation
      .findOneAndUpdate(
        {
          _id:
            quotationId,

          companyId,

          status: {
            $in: [
              "requested",
              "received"
            ]
          }
        },

        {
          $set: {
            status:
              "selected",

            selectedAt:
              new Date(),

            selectedBy,

            updatedBy:
              selectedBy,

            rejectedAt:
              null,

            rejectedBy:
              null,

            rejectionReason:
              ""
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
     REJECT QUOTATION
  ========================================================== */

  async rejectById(
    companyId,
    quotationId,
    rejectedBy,
    rejectionReason = ""
  ) {

    return PurchaseQuotation
      .findOneAndUpdate(
        {
          _id:
            quotationId,

          companyId,

          status: {
            $in: [
              "requested",
              "received"
            ]
          }
        },

        {
          $set: {
            status:
              "rejected",

            rejectedAt:
              new Date(),

            rejectedBy,

            rejectionReason,

            updatedBy:
              rejectedBy
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
     FIND SELECTED QUOTATION FOR PR
  ========================================================== */

  async findSelectedForPurchaseRequest(
    companyId,
    purchaseRequestId
  ) {

    return PurchaseQuotation
      .findOne({
        companyId,

        purchaseRequestId,

        status:
          "selected"
      })
      .lean();
  }


  /* ==========================================================
     REJECT OTHER QUOTATIONS FOR SAME PR
     Called only after service validates the selected quotation.
  ========================================================== */

  async rejectOtherQuotationsForPurchaseRequest(
    companyId,
    purchaseRequestId,
    selectedQuotationId,
    updatedBy
  ) {

    if (
      !purchaseRequestId
    ) {

      return {
        acknowledged:
          true,

        modifiedCount:
          0
      };
    }


    return PurchaseQuotation
      .updateMany(
        {
          companyId,

          purchaseRequestId,

          _id: {
            $ne:
              selectedQuotationId
          },

          status: {
            $in: [
              "requested",
              "received"
            ]
          }
        },

        {
          $set: {
            status:
              "rejected",

            rejectedAt:
              new Date(),

            rejectedBy:
              updatedBy,

            rejectionReason:
              "Another quotation was selected for this Purchase Request.",

            updatedBy
          }
        }
      );
  }


  /* ==========================================================
     COMPARISON
  ========================================================== */

  async findForComparison(
    companyId,
    purchaseRequestId
  ) {

    return PurchaseQuotation
      .find({
        companyId,

        purchaseRequestId
      })
      .sort({
        grandTotal:
          1,

        quotationDate:
          -1
      })
      .lean();
  }


  /* ==========================================================
     COUNT BY STATUS
  ========================================================== */

  async countByStatus(
    companyId
  ) {

    const rows =
      await PurchaseQuotation.aggregate([
        {
          $match: {
            companyId:
              typeof companyId ===
              "string"
                ? new PurchaseQuotation
                    .base
                    .Types
                    .ObjectId(
                      companyId
                    )
                : companyId
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
      requested:
        0,

      received:
        0,

      selected:
        0,

      rejected:
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
     PR QUOTATION COUNT
  ========================================================== */

  async countForPurchaseRequest(
    companyId,
    purchaseRequestId
  ) {

    return PurchaseQuotation
      .countDocuments({
        companyId,

        purchaseRequestId
      });
  }


  /* ==========================================================
     VENDOR ENQUIRY QUOTATION
  ========================================================== */

  async findByVendorEnquiry(
    companyId,
    vendorEnquiryId
  ) {

    return PurchaseQuotation
      .findOne({
        companyId,

        vendorEnquiryId
      })
      .lean();
  }

}


export default new PurchaseQuotationRepository();