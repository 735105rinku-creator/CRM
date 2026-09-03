import mongoose from "mongoose";

import {
  JOURNAL_REFERENCE_TYPES,
  JOURNAL_STATUSES,
} from "../constants/accounting.js";


/* ============================================================
   JOURNAL LINE SCHEMA
============================================================ */

const journalLineSchema =
  new mongoose.Schema(
    {

      /* ======================================================
         ACCOUNT REFERENCE
      ====================================================== */

      accountId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "ChartOfAccount",

        required:
          true,
      },


      /*
       * Snapshot fields.
       *
       * Even if the Chart of Account name is changed later,
       * historical Journal Entries retain the account identity
       * that existed when the entry was recorded.
       */

      accountCode: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        maxlength:
          40,
      },


      accountName: {
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
          500,

        default:
          "",
      },


      /* ======================================================
         DEBIT / CREDIT
      ====================================================== */

      debit: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },


      credit: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },

    },

    {
      _id:
        true,

      id:
        false,

      versionKey:
        false,
    }
  );


/* ============================================================
   JOURNAL LINE BASIC VALIDATION
============================================================ */

journalLineSchema.pre(
  "validate",

  function validateJournalLine(
    next
  ) {

    const debit =
      Number(
        this.debit ||
        0
      );


    const credit =
      Number(
        this.credit ||
        0
      );


    /*
     * A journal line must carry an amount.
     */

    if (
      debit <= 0 &&
      credit <= 0
    ) {

      return next(
        new Error(
          "Journal line must contain either a debit or credit amount."
        )
      );
    }


    /*
     * A single line cannot be debit and credit simultaneously.
     */

    if (
      debit > 0 &&
      credit > 0
    ) {

      return next(
        new Error(
          "Journal line cannot contain both debit and credit amounts."
        )
      );
    }


    next();

  }
);


/* ============================================================
   JOURNAL ENTRY SCHEMA
============================================================ */

const journalEntrySchema =
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
         JOURNAL IDENTITY
      ====================================================== */

      journalNumber: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        maxlength:
          60,

        immutable:
          true,
      },


      journalDate: {
        type:
          Date,

        required:
          true,
      },


      narration: {
        type:
          String,

        trim:
          true,

        maxlength:
          1000,

        default:
          "",
      },


      /* ======================================================
         SOURCE / REFERENCE
      ====================================================== */

      referenceType: {
        type:
          String,

        enum:
          JOURNAL_REFERENCE_TYPES,

        default:
          "manual",
      },


      referenceId: {
        type:
          mongoose.Schema.Types.ObjectId,

        default:
          null,
      },


      referenceNo: {
        type:
          String,

        trim:
          true,

        maxlength:
          120,

        default:
          "",
      },


      /* ======================================================
         JOURNAL STATUS
      ====================================================== */

      status: {
        type:
          String,

        enum:
          JOURNAL_STATUSES,

        default:
          "draft",
      },


      /* ======================================================
         TOTALS
      ====================================================== */

      totalDebit: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },


      totalCredit: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },


      /* ======================================================
         JOURNAL LINES
      ====================================================== */

      lines: {
        type: [
          journalLineSchema
        ],

        required:
          true,

        default:
          [],
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


      /* ======================================================
         POSTING AUDIT
      ====================================================== */

      postedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      postedAt: {
        type:
          Date,

        default:
          null,
      },


      /* ======================================================
         VOID AUDIT
      ====================================================== */

      voidedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },


      voidedAt: {
        type:
          Date,

        default:
          null,
      },


      voidReason: {
        type:
          String,

        trim:
          true,

        maxlength:
          1000,

        default:
          "",
      },

    },

    {

      timestamps:
        true,

      versionKey:
        false,


      /*
       * Defining/importing this model must not automatically
       * create a collection or build indexes.
       */

      autoCreate:
        false,

      autoIndex:
        false,


      collection:
        "journal_entries",

    }
  );


/* ============================================================
   BASIC JOURNAL VALIDATION

   More complex rules such as:
   - account belongs to same company
   - account is active
   - allowManualEntry
   - posted journal immutability
   - void workflow

   will be enforced in the Service layer.
============================================================ */

journalEntrySchema.pre(
  "validate",

  function validateJournalEntry(
    next
  ) {

    if (
      !Array.isArray(
        this.lines
      ) ||
      this.lines.length < 2
    ) {

      return next(
        new Error(
          "Journal Entry must contain at least two lines."
        )
      );
    }


    const totalDebit =
      this.lines.reduce(
        (
          total,
          line
        ) =>
          total +
          Number(
            line.debit ||
            0
          ),
        0
      );


    const totalCredit =
      this.lines.reduce(
        (
          total,
          line
        ) =>
          total +
          Number(
            line.credit ||
            0
          ),
        0
      );


    /*
     * Avoid floating-point comparison issues.
     */

    const roundedDebit =
      Math.round(
        totalDebit *
        100
      ) /
      100;


    const roundedCredit =
      Math.round(
        totalCredit *
        100
      ) /
      100;


    if (
      roundedDebit <= 0 ||
      roundedCredit <= 0
    ) {

      return next(
        new Error(
          "Journal Entry must contain debit and credit amounts."
        )
      );
    }


    if (
      roundedDebit !==
      roundedCredit
    ) {

      return next(
        new Error(
          "Journal Entry total debit and total credit must be equal."
        )
      );
    }


    /*
     * Totals are derived from lines.
     * Client-provided totals are not trusted.
     */

    this.totalDebit =
      roundedDebit;


    this.totalCredit =
      roundedCredit;


    next();

  }
);


/* ============================================================
   INDEX DEFINITIONS

   autoIndex=false means these are not automatically created
   simply because the backend starts.
============================================================ */

/*
 * Journal number unique per company.
 */

journalEntrySchema.index(
  {
    companyId:
      1,

    journalNumber:
      1,
  },

  {
    unique:
      true,

    name:
      "company_journal_number_unique",
  }
);


/*
 * Common Journal listing.
 */

journalEntrySchema.index(
  {
    companyId:
      1,

    journalDate:
      -1,

    status:
      1,
  },

  {
    name:
      "company_journal_listing",
  }
);


/*
 * Reference lookup.
 */

journalEntrySchema.index(
  {
    companyId:
      1,

    referenceType:
      1,

    referenceId:
      1,
  },

  {
    name:
      "company_journal_reference",
  }
);


/*
 * Later General Ledger lookup by account.
 */

journalEntrySchema.index(
  {
    companyId:
      1,

    "lines.accountId":
      1,

    journalDate:
      1,

    status:
      1,
  },

  {
    name:
      "company_account_ledger_lookup",
  }
);


/* ============================================================
   MODEL
============================================================ */

const JournalEntry =
  mongoose.models
    .JournalEntry ||
  mongoose.model(
    "JournalEntry",
    journalEntrySchema
  );


export default
  JournalEntry;