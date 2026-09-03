import mongoose from "mongoose";

import JournalEntry
  from "../models/JournalEntry.js";


/* ============================================================
   HELPERS
============================================================ */

const escapeRegex =
  (
    value
  ) =>
    String(
      value ||
      ""
    )
      .replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );


const toObjectId =
  (
    value
  ) => {

    if (
      value instanceof
        mongoose.Types.ObjectId
    ) {

      return value;
    }


    return new mongoose.Types.ObjectId(
      String(
        value
      )
    );
  };


/* ============================================================
   JOURNAL ENTRY REPOSITORY
============================================================ */

class JournalEntryRepository {

  /* ==========================================================
     CREATE
  ========================================================== */

  async create(
    payload
  ) {

    return JournalEntry
      .create(
        payload
      );
  }


  /* ==========================================================
     FIND ONE

     Every lookup is company-scoped.
  ========================================================== */

  async findById({
    companyId,
    journalEntryId,
  }) {

    return JournalEntry
      .findOne({

        _id:
          journalEntryId,

        companyId,

      })
      .lean();
  }


  /* ==========================================================
     LIST JOURNAL ENTRIES
  ========================================================== */

  async list({
    companyId,

    search = "",

    status = "",

    referenceType = "",

    accountId = null,

    from = null,

    to = null,

    sortBy = "journalDate",

    sortOrder = "desc",
  }) {

    const filter = {
      companyId,
    };


    /* --------------------------------------------------------
       STATUS
    -------------------------------------------------------- */

    if (
      status
    ) {

      filter.status =
        status;
    }


    /* --------------------------------------------------------
       REFERENCE TYPE
    -------------------------------------------------------- */

    if (
      referenceType
    ) {

      filter.referenceType =
        referenceType;
    }


    /* --------------------------------------------------------
       ACCOUNT
    -------------------------------------------------------- */

    if (
      accountId
    ) {

      filter[
        "lines.accountId"
      ] =
        accountId;
    }


    /* --------------------------------------------------------
       DATE RANGE
    -------------------------------------------------------- */

    if (
      from ||
      to
    ) {

      filter.journalDate =
        {};


      if (
        from
      ) {

        filter.journalDate.$gte =
          new Date(
            from
          );
      }


      if (
        to
      ) {

        const endDate =
          new Date(
            to
          );


        endDate.setHours(
          23,
          59,
          59,
          999
        );


        filter.journalDate.$lte =
          endDate;
      }

    }


    /* --------------------------------------------------------
       SEARCH
    -------------------------------------------------------- */

    const searchValue =
      String(
        search ||
        ""
      )
        .trim();


    if (
      searchValue
    ) {

      const regex =
        new RegExp(
          escapeRegex(
            searchValue
          ),
          "i"
        );


      filter.$or = [

        {
          journalNumber:
            regex,
        },

        {
          narration:
            regex,
        },

        {
          referenceNo:
            regex,
        },

        {
          "lines.accountCode":
            regex,
        },

        {
          "lines.accountName":
            regex,
        },

      ];

    }


    /* --------------------------------------------------------
       SAFE SORTING
    -------------------------------------------------------- */

    const allowedSortFields =
      new Set([
        "journalNumber",
        "journalDate",
        "status",
        "referenceType",
        "totalDebit",
        "totalCredit",
        "createdAt",
        "updatedAt",
      ]);


    const safeSortBy =
      allowedSortFields
        .has(
          sortBy
        )
        ? sortBy
        : "journalDate";


    const direction =
      sortOrder ===
        "asc"
        ? 1
        : -1;


    return JournalEntry
      .find(
        filter
      )
      .sort({

        [safeSortBy]:
          direction,

        createdAt:
          direction,

      })
      .lean();
  }


  /* ==========================================================
     UPDATE DRAFT

     Posted / void journals can never pass this filter.
  ========================================================== */

  async updateDraftById({
    companyId,
    journalEntryId,
    payload,
  }) {

    return JournalEntry
      .findOneAndUpdate(

        {
          _id:
            journalEntryId,

          companyId,

          status:
            "draft",
        },

        {
          $set:
            payload,
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     POST JOURNAL

     Atomic state transition:

       draft → posted

     Two concurrent requests cannot both successfully post the
     same Journal because the filter requires status=draft.
  ========================================================== */

  async postById({
    companyId,
    journalEntryId,
    userId = null,
    postedAt = new Date(),
  }) {

    return JournalEntry
      .findOneAndUpdate(

        {
          _id:
            journalEntryId,

          companyId,

          status:
            "draft",
        },

        {
          $set: {

            status:
              "posted",

            postedBy:
              userId,

            postedAt,

            updatedBy:
              userId,

          },
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     VOID JOURNAL

     Atomic state transition:

       posted → void

     Draft entries should be edited instead.
     Already-void entries cannot be voided twice.
  ========================================================== */

  async voidById({
    companyId,
    journalEntryId,
    userId = null,
    reason,
    voidedAt = new Date(),
  }) {

    return JournalEntry
      .findOneAndUpdate(

        {
          _id:
            journalEntryId,

          companyId,

          status:
            "posted",
        },

        {
          $set: {

            status:
              "void",

            voidReason:
              String(
                reason ||
                ""
              )
                .trim(),

            voidedBy:
              userId,

            voidedAt,

            updatedBy:
              userId,

          },
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }

      )
      .lean();
  }


  /* ==========================================================
     GENERAL LEDGER FOUNDATION

     Returns ONLY posted Journal lines for one account.

     Void and Draft Journals are intentionally excluded.
  ========================================================== */

  async findPostedLinesByAccount({
    companyId,
    accountId,

    from = null,

    to = null,
  }) {

    const match = {

      companyId:
        toObjectId(
          companyId
        ),

      status:
        "posted",

      "lines.accountId":
        toObjectId(
          accountId
        ),

    };


    if (
      from ||
      to
    ) {

      match.journalDate =
        {};


      if (
        from
      ) {

        match.journalDate.$gte =
          new Date(
            from
          );
      }


      if (
        to
      ) {

        const endDate =
          new Date(
            to
          );


        endDate.setHours(
          23,
          59,
          59,
          999
        );


        match.journalDate.$lte =
          endDate;
      }

    }


    return JournalEntry
      .aggregate([

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
              toObjectId(
                accountId
              ),
          },
        },

        {
          $project: {

            _id:
              0,

            journalEntryId:
              "$_id",

            journalNumber:
              1,

            journalDate:
              1,

            narration:
              1,

            referenceType:
              1,

            referenceId:
              1,

            referenceNo:
              1,

            postedAt:
              1,

            lineId:
              "$lines._id",

            accountId:
              "$lines.accountId",

            accountCode:
              "$lines.accountCode",

            accountName:
              "$lines.accountName",

            description:
              "$lines.description",

            debit:
              "$lines.debit",

            credit:
              "$lines.credit",

          },
        },

        {
          $sort: {

            journalDate:
              1,

            journalNumber:
              1,

          },
        },

      ]);
  }

}


/* ============================================================
   EXPORT
============================================================ */

export const journalEntryRepository =
  new JournalEntryRepository();


export default
  journalEntryRepository;