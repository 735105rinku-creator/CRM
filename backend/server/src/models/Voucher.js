import mongoose from "mongoose";

import {
  VOUCHER_STATUSES,
  VOUCHER_TYPES,
} from "../constants/accounting.js";


/* ============================================================
   VOUCHER LINE SCHEMA
============================================================ */

const voucherLineSchema =
  new mongoose.Schema(
    {

      /* ======================================================
         ACCOUNT
      ====================================================== */

      accountId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "ChartOfAccount",

        required:
          true,
      },


      accountCode: {
        type:
          String,

        trim:
          true,

        uppercase:
          true,

        maxlength:
          40,

        default:
          "",
      },


      accountName: {
        type:
          String,

        trim:
          true,

        maxlength:
          160,

        default:
          "",
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
   VOUCHER SCHEMA
============================================================ */

const voucherSchema =
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
         VOUCHER IDENTITY
      ====================================================== */

      voucherNumber: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        maxlength:
          80,
      },


      voucherType: {
        type:
          String,

        enum:
          VOUCHER_TYPES,

        required:
          true,
      },


      financialYear: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          20,
      },


      voucherDate: {
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
         REFERENCE
      ====================================================== */

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


      referenceDate: {
        type:
          Date,

        default:
          null,
      },


      /* ======================================================
         PARTY
      ====================================================== */

      partyAccountId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "ChartOfAccount",

        default:
          null,
      },


      /* ======================================================
         VOUCHER LINES
      ====================================================== */

      lines: {
        type: [
          voucherLineSchema
        ],

        required:
          true,

        default:
          [],
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
         LIFECYCLE
      ====================================================== */

      status: {
        type:
          String,

        enum:
          VOUCHER_STATUSES,

        default:
          "draft",
      },


      /* ======================================================
         JOURNAL LINK
      ====================================================== */

      journalEntryId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "JournalEntry",

        default:
          null,
      },


      /* ======================================================
         SOURCE
      ====================================================== */

      sourceModule: {
        type:
          String,

        trim:
          true,

        maxlength:
          80,

        default:
          "accounts",
      },


      sourceReferenceId: {
        type:
          mongoose.Schema.Types.ObjectId,

        default:
          null,
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
       * Importing this model must not create a collection
       * or build database indexes automatically.
       */

      autoCreate:
        false,

      autoIndex:
        false,

      collection:
        "vouchers",
    }
  );


/* ============================================================
   INDEXES
============================================================ */

/*
 * Tally-style voucher identity:
 *
 * separate numbering per company,
 * financial year and voucher type.
 */

voucherSchema.index(
  {
    companyId:
      1,

    financialYear:
      1,

    voucherType:
      1,

    voucherNumber:
      1,
  },

  {
    unique:
      true,

    name:
      "company_fy_voucher_type_number_unique",
  }
);


/*
 * Common voucher listing.
 */

voucherSchema.index(
  {
    companyId:
      1,

    voucherDate:
      -1,

    voucherType:
      1,

    status:
      1,
  },

  {
    name:
      "company_voucher_listing",
  }
);


/*
 * Linked Journal Entry lookup.
 */

voucherSchema.index(
  {
    companyId:
      1,

    journalEntryId:
      1,
  },

  {
    name:
      "company_voucher_journal",
  }
);


/*
 * Party ledger lookup.
 */

voucherSchema.index(
  {
    companyId:
      1,

    partyAccountId:
      1,

    voucherDate:
      -1,
  },

  {
    name:
      "company_party_voucher_lookup",
  }
);


/* ============================================================
   MODEL
============================================================ */

const Voucher =
  mongoose.models
    .Voucher ||
  mongoose.model(
    "Voucher",
    voucherSchema
  );


export default
  Voucher;
