import mongoose from "mongoose";

import JournalEntry
  from "../models/JournalEntry.js";


const startOfDay =
  (value) =>
    new Date(`${value}T00:00:00.000Z`);

const endOfDay =
  (value) =>
    new Date(`${value}T23:59:59.999Z`);


export class DayBookRepository {

  async listPosted({
    companyId,
    from,
    to,
    voucherType = null,
    sort = "desc",
    page = 1,
    limit = 25,
  }) {

    const sortDirection =
      sort === "asc"
        ? 1
        : -1;

    const pipeline = [
      {
        $match: {
          companyId:
            new mongoose.Types.ObjectId(
              String(companyId)
            ),

          status:
            "posted",

          journalDate: {
            $gte:
              startOfDay(from),

            $lte:
              endOfDay(to),
          },
        },
      },

      {
        $lookup: {
          from: "vouchers",
          let: {
            referenceId: "$referenceId",
            companyId: "$companyId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$referenceId"] },
                    { $eq: ["$companyId", "$$companyId"] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                voucherType: 1,
                voucherNumber: 1,
              },
            },
          ],
          as: "linkedVoucher",
        },
      },

      {
        $set: {
          linkedVoucher: {
            $arrayElemAt: ["$linkedVoucher", 0],
          },
        },
      },

      {
        $set: {
          resolvedVoucherType: {
            $cond: [
              { $eq: ["$referenceType", "voucher"] },
              {
                $ifNull: [
                  "$linkedVoucher.voucherType",
                  "journal",
                ],
              },
              {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ["$referenceType", "sales_invoice"] },
                      then: "sales",
                    },
                    {
                      case: { $eq: ["$referenceType", "purchase_bill"] },
                      then: "purchase",
                    },
                    {
                      case: { $eq: ["$referenceType", "payment"] },
                      then: "payment",
                    },
                    {
                      case: { $eq: ["$referenceType", "receipt"] },
                      then: "receipt",
                    },
                    {
                      case: { $eq: ["$referenceType", "credit_note"] },
                      then: "credit_note",
                    },
                    {
                      case: { $eq: ["$referenceType", "debit_note"] },
                      then: "debit_note",
                    },
                  ],
                  default: "journal",
                },
              },
            ],
          },
        },
      },

      ...(
        voucherType
          ? [
              {
                $match: {
                  resolvedVoucherType: voucherType,
                },
              },
            ]
          : []
      ),

      {
        $facet: {
          rows: [
            {
              $sort: {
                journalDate:
                  sortDirection,

                journalNumber:
                  sortDirection,
              },
            },

            {
              $skip:
                (page - 1) *
                limit,
            },

            {
              $limit:
                limit,
            },
          ],

          summary: [
            {
              $group: {
                _id:
                  null,

                voucherCount: {
                  $sum: 1,
                },

                totalDebit: {
                  $sum:
                    "$totalDebit",
                },

                totalCredit: {
                  $sum:
                    "$totalCredit",
                },
              },
            },
          ],
        },
      },
    ];

    const [result = {}] =
      await JournalEntry.aggregate(
        pipeline
      );

    const summary =
      result.summary?.[0] ||
      {};

    return {
      rows:
        result.rows ||
        [],

      total:
        Number(
          summary.voucherCount ||
          0
        ),

      totals: {
        voucherCount:
          Number(
            summary.voucherCount ||
            0
          ),

        totalDebit:
          Number(
            summary.totalDebit ||
            0
          ),

        totalCredit:
          Number(
            summary.totalCredit ||
            0
          ),
      },
    };
  }

}
