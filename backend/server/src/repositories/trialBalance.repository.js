import mongoose from "mongoose";

import ChartOfAccount from "../models/ChartOfAccount.js";
import JournalEntry from "../models/JournalEntry.js";


const endOfDay = (value) => {

  const date =
    new Date(
      `${value}T23:59:59.999Z`
    );

  return date;

};


export class TrialBalanceRepository {

  constructor({
    chartOfAccountModel = ChartOfAccount,
    journalEntryModel = JournalEntry,
  } = {}) {

    this.chartOfAccountModel =
      chartOfAccountModel;

    this.journalEntryModel =
      journalEntryModel;

  }


  async list({
    companyId,
  }) {

    return this.chartOfAccountModel
      .find({
        companyId,
      })
      .select(
        [
          "accountCode",
          "accountName",
          "nature",
          "accountType",
          "status",
          "openingBalance",
          "openingBalanceType",
        ].join(" ")
      )
      .sort({
        accountCode: 1,
        accountName: 1,
      })
      .lean();

  }


  async findPostedLinesByAccount({
    companyId,
    accountId,
    to,
  }) {

    const companyObjectId =
      mongoose.Types.ObjectId.isValid(
        companyId
      )
        ? new mongoose.Types.ObjectId(
            companyId
          )
        : companyId;

    const accountObjectId =
      mongoose.Types.ObjectId.isValid(
        accountId
      )
        ? new mongoose.Types.ObjectId(
            accountId
          )
        : accountId;


    const match = {

      companyId:
        companyObjectId,

      status:
        "posted",

      "lines.accountId":
        accountObjectId,

    };


    if (to) {

      match.journalDate = {
        $lte:
          endOfDay(to),
      };

    }


    return this.journalEntryModel.aggregate([
      {
        $match:
          match,
      },
      {
        $unwind:
          "$lines",
      },
      {
        $match: {
          "lines.accountId":
            accountObjectId,
        },
      },
      {
        $project: {
          _id: 0,
          journalDate: 1,
          debit: {
            $ifNull: [
              "$lines.debit",
              0,
            ],
          },
          credit: {
            $ifNull: [
              "$lines.credit",
              0,
            ],
          },
        },
      },
      {
        $sort: {
          journalDate: 1,
        },
      },
    ]);

  }

}
