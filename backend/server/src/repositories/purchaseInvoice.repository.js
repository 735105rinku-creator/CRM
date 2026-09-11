import PurchaseInvoice from "../models/PurchaseInvoice.js";


/* ============================================================
   HELPERS
============================================================ */

const escapeRegex = value =>
  String(
    value || ""
  )
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );


/* ============================================================
   REPOSITORY
============================================================ */

class PurchaseInvoiceRepository {


  /* ==========================================================
     CREATE
  ========================================================== */

  create(
    payload
  ) {

    return PurchaseInvoice
      .create(
        payload
      );
  }


  /* ==========================================================
     FIND BY ID
  ========================================================== */

  findById(
    companyId,
    id
  ) {

    return PurchaseInvoice
      .findOne({
        _id:
          id,

        companyId
      })
      .populate({
        path:
          "verifiedBy handedOffBy",

        select:
          "name",

        match: {
          companyId
        }
      })
      .lean();
  }


  /* ==========================================================
     FIND DOCUMENT BY ID
  ========================================================== */

  findDocumentById(
    companyId,
    id
  ) {

    return PurchaseInvoice
      .findOne({
        _id:
          id,

        companyId
      });
  }


  /* ==========================================================
     DUPLICATE INVOICE CHECK

     excludeId is used during edit so the current invoice
     does not detect itself as a duplicate.
  ========================================================== */

  findDuplicate(
    companyId,
    vendorId,
    vendorInvoiceNumber,
    excludeId = null
  ) {

    const filter = {
      companyId,
      vendorId,
      vendorInvoiceNumber
    };


    if (
      excludeId
    ) {

      filter._id = {
        $ne:
          excludeId
      };
    }


    return PurchaseInvoice
      .findOne(
        filter
      )
      .lean();
  }


  /* ==========================================================
     UPDATE EDITABLE INVOICE

     Important:
     - Company scoped.
     - Only pre-verification invoices can be edited.
     - Verified invoices cannot be modified here.
     - Handed-off invoices cannot be modified here.
     - Matching result is recalculated by service before this
       method receives the payload.
  ========================================================== */

  updateEditableById(
    companyId,
    id,
    payload
  ) {

    return PurchaseInvoice
      .findOneAndUpdate(
        {
          _id:
            id,

          companyId,

          status: {
            $in: [
              "matched",
              "exception"
            ]
          },

          verifiedAt:
            null,

          handoffStatus: {
            $in: [
              "not_handed_off",
              "failed"
            ]
          },

          accountsVoucherId:
            null
        },

        {
          $set:
            payload
        },

        {
          new:
            true,

          runValidators:
            true
        }
      )
      .lean();
  }


  /* ==========================================================
     LIST
  ========================================================== */

  async list(
    companyId,
    query = {}
  ) {

    const filter = {
      companyId
    };


    for (
      const key of [
        "status",
        "matchStatus",
        "handoffStatus",
        "vendorId",
        "purchaseOrderId"
      ]
    ) {

      if (
        query[
          key
        ]
      ) {

        filter[
          key
        ] =
          query[
            key
          ];
      }

    }


    if (
      query.from ||
      query.to
    ) {

      filter.invoiceDate =
        {};


      if (
        query.from
      ) {

        filter.invoiceDate.$gte =
          new Date(
            query.from
          );
      }


      if (
        query.to
      ) {

        const end =
          new Date(
            query.to
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


    if (
      query.search
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            query.search
          ),
          "i"
        );


      filter.$or = [
        {
          vendorInvoiceNumber:
            regex
        },

        {
          vendorName:
            regex
        },

        {
          poNumber:
            regex
        },

        {
          grnNumbers:
            regex
        }
      ];
    }


    const page =
      Math.max(
        Number(
          query.page ||
          1
        ),
        1
      );


    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit ||
            25
          ),
          1
        ),
        200
      );


    const [
      rows,
      total
    ] =
      await Promise.all([

        PurchaseInvoice
          .find(
            filter
          )
          .sort({
            invoiceDate:
              -1,

            createdAt:
              -1
          })
          .skip(
            (
              page -
              1
            ) *
            limit
          )
          .limit(
            limit
          )
          .lean(),

        PurchaseInvoice
          .countDocuments(
            filter
          )

      ]);


    return {

      rows,

      pagination: {
        total,
        page,
        limit,

        pages:
          Math.max(
            Math.ceil(
              total /
              limit
            ),
            1
          )
      }

    };
  }


  /* ==========================================================
     VERIFY
  ========================================================== */

  verify(
    companyId,
    id,
    userId
  ) {

    return PurchaseInvoice
      .findOneAndUpdate(
        {
          _id:
            id,

          companyId,

          matchStatus:
            "matched",

          status:
            "matched",

          verifiedAt:
            null
        },

        {
          $set: {
            status:
              "verified",

            verifiedBy:
              userId,

            verifiedAt:
              new Date(),

            updatedBy:
              userId
          }
        },

        {
          new:
            true,

          runValidators:
            true
        }
      )
      .lean();
  }


  /* ==========================================================
     CLAIM HANDOFF
  ========================================================== */

  claimHandoff(
    companyId,
    id,
    userId
  ) {

    return PurchaseInvoice
      .findOneAndUpdate(
        {
          _id:
            id,

          companyId,

          status:
            "verified",

          handoffStatus: {
            $in: [
              "not_handed_off",
              "failed"
            ]
          },

          accountsVoucherId:
            null
        },

        {
          $set: {
            handoffStatus:
              "handing_off",

            handoffError:
              "",

            updatedBy:
              userId
          }
        },

        {
          new:
            true
        }
      )
      .lean();
  }


  /* ==========================================================
     COMPLETE HANDOFF
  ========================================================== */

  completeHandoff(
    companyId,
    id,
    userId,
    voucher
  ) {

    return PurchaseInvoice
      .findOneAndUpdate(
        {
          _id:
            id,

          companyId,

          handoffStatus:
            "handing_off"
        },

        {
          $set: {
            handoffStatus:
              "handed_off",

            accountsVoucherId:
              voucher._id,

            accountsVoucherNumber:
              voucher.voucherNumber,

            handedOffBy:
              userId,

            handedOffAt:
              new Date(),

            handoffError:
              "",

            updatedBy:
              userId
          }
        },

        {
          new:
            true
        }
      )
      .lean();
  }


  /* ==========================================================
     FAIL HANDOFF
  ========================================================== */

  failHandoff(
    companyId,
    id,
    error,
    userId
  ) {

    return PurchaseInvoice
      .updateOne(
        {
          _id:
            id,

          companyId,

          handoffStatus:
            "handing_off"
        },

        {
          $set: {
            handoffStatus:
              "failed",

            handoffError:
              String(
                error ||
                "Accounts handoff failed."
              )
                .slice(
                  0,
                  500
                ),

            updatedBy:
              userId
          }
        }
      );
  }


  /* ==========================================================
     METRICS
  ========================================================== */

  async metrics(
    companyId
  ) {

    const rows =
      await PurchaseInvoice.aggregate([

        {
          $match: {
            companyId
          }
        },

        {
          $group: {

            _id:
              null,

            total: {
              $sum:
                1
            },

            pendingVerification: {
              $sum: {
                $cond: [
                  {
                    $ne: [
                      "$status",
                      "verified"
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            matched: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$matchStatus",
                      "matched"
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            exceptions: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$matchStatus",
                      "exception"
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            verified: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "verified"
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            pendingHandoff: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: [
                          "$status",
                          "verified"
                        ]
                      },

                      {
                        $ne: [
                          "$handoffStatus",
                          "handed_off"
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            handedOff: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$handoffStatus",
                      "handed_off"
                    ]
                  },
                  1,
                  0
                ]
              }
            },

            invoiceTotal: {
              $sum:
                "$invoiceTotal"
            }

          }
        }

      ]);


    return rows[0] || {

      total:
        0,

      pendingVerification:
        0,

      matched:
        0,

      exceptions:
        0,

      verified:
        0,

      pendingHandoff:
        0,

      handedOff:
        0,

      invoiceTotal:
        0

    };
  }


  /* ==========================================================
     SETTLEMENT ROWS
  ========================================================== */

  settlementRows(
    companyId
  ) {

    return PurchaseInvoice
      .find({
        companyId,

        handoffStatus:
          "handed_off"
      })
      .select(
        "invoiceTotal"
      )
      .lean();
  }

}


export default new PurchaseInvoiceRepository();