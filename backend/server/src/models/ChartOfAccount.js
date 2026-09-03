import mongoose from "mongoose";

import {
  ACCOUNT_NATURES,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_NATURE,
  DEBIT_CREDIT_TYPES,
  NORMAL_BALANCE_BY_NATURE,
} from "../constants/accounting.js";


/* ============================================================
   CHART OF ACCOUNT SCHEMA
============================================================ */

const chartOfAccountSchema =
  new mongoose.Schema(
    {

      /* ======================================================
         TENANT / COMPANY
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
         ACCOUNT IDENTITY
      ====================================================== */

      accountCode: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,

        minlength:
          1,

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

        minlength:
          1,

        maxlength:
          160,
      },


      description: {
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
         ACCOUNT CLASSIFICATION
      ====================================================== */

      nature: {
        type:
          String,

        enum:
          ACCOUNT_NATURES,

        required:
          true,

        immutable:
          true,
      },


      accountType: {
        type:
          String,

        enum:
          ACCOUNT_TYPES,

        required:
          true,

        validate: {

          validator(
            value
          ) {

            if (
              !value ||
              !this.nature
            ) {
              return true;
            }


            return (
              ACCOUNT_TYPE_NATURE[
                value
              ] ===
              this.nature
            );
          },


          message:
            "Account type does not belong to the selected account nature.",
        },
      },


      /* ======================================================
         ACCOUNT HIERARCHY
      ====================================================== */

      parentAccountId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "ChartOfAccount",

        default:
          null,
      },


      /* ======================================================
         OPENING BALANCE

         Current balance is intentionally NOT stored here.

         Journal + Ledger will become the source of truth
         for live/current balances.
      ====================================================== */

      openingBalance: {
        type:
          Number,

        min:
          0,

        default:
          0,

        immutable:
          true,
      },


      openingBalanceType: {
        type:
          String,

        enum:
          DEBIT_CREDIT_TYPES,

        immutable:
          true,

        default() {

          return (
            NORMAL_BALANCE_BY_NATURE[
              this.nature
            ] ||
            "debit"
          );
        },
      },


      /* ======================================================
         SYSTEM / MANUAL ENTRY FLAGS
      ====================================================== */

      isSystemAccount: {
        type:
          Boolean,

        default:
          false,

        immutable:
          true,
      },


      allowManualEntry: {
        type:
          Boolean,

        default:
          true,
      },


      /* ======================================================
         STATUS
      ====================================================== */

      status: {
        type:
          String,

        enum:
          ACCOUNT_STATUSES,

        default:
          "active",
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

    },

    {

      timestamps:
        true,

      versionKey:
        false,


      /*
       * CRITICAL FOR CURRENT PROJECT CONSTRAINT:
       *
       * Defining/importing this model must not create a
       * collection or build indexes automatically merely
       * because the backend restarted.
       */

      autoCreate:
        false,

      autoIndex:
        false,


      collection:
        "chart_of_accounts",

    }
  );


/* ============================================================
   DOCUMENT VALIDATION
============================================================ */

/*
 * Parent account cannot point to the account itself.
 *
 * Cross-account validation such as:
 *
 * - parent belongs to same company
 * - parent nature matches child
 * - circular hierarchy prevention
 *
 * belongs in the Service layer because it requires database
 * lookup and tenant-aware business rules.
 */

chartOfAccountSchema.pre(
  "validate",

  function validateSelfParent(
    next
  ) {

    if (
      this._id &&
      this.parentAccountId &&
      String(
        this._id
      ) ===
      String(
        this.parentAccountId
      )
    ) {

      return next(
        new Error(
          "An account cannot be its own parent."
        )
      );
    }


    next();
  }
);


/* ============================================================
   INDEX DEFINITIONS

   These definitions describe the intended production indexes.

   Because autoIndex=false, simply importing this model or
   restarting Node will NOT automatically build them.
============================================================ */

/*
 * Account Code must be unique inside one company.
 */

chartOfAccountSchema.index(
  {
    companyId:
      1,

    accountCode:
      1,
  },
  {
    unique:
      true,

    name:
      "company_account_code_unique",
  }
);


/*
 * Common Chart of Accounts listing filters.
 */

chartOfAccountSchema.index(
  {
    companyId:
      1,

    status:
      1,

    nature:
      1,

    accountName:
      1,
  },
  {
    name:
      "company_chart_listing",
  }
);


/*
 * Parent / child hierarchy lookup.
 */

chartOfAccountSchema.index(
  {
    companyId:
      1,

    parentAccountId:
      1,
  },
  {
    name:
      "company_parent_account",
  }
);


/* ============================================================
   OUTPUT TRANSFORMATION
============================================================ */

const transformAccount =
  (
    _document,
    returned
  ) => {

    /*
     * currentBalance intentionally does not exist as a stored
     * schema field.
     *
     * Until Journal/Ledger is implemented, frontend can fall
     * back to openingBalance as it already does.
     */

    return returned;
  };


chartOfAccountSchema.set(
  "toJSON",
  {
    transform:
      transformAccount,
  }
);


chartOfAccountSchema.set(
  "toObject",
  {
    transform:
      transformAccount,
  }
);


/* ============================================================
   MODEL
============================================================ */

const ChartOfAccount =
  mongoose.models
    .ChartOfAccount ||
  mongoose.model(
    "ChartOfAccount",
    chartOfAccountSchema
  );


export default ChartOfAccount;