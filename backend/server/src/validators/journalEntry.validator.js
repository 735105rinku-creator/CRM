import Joi from "joi";

import {
  JOURNAL_REFERENCE_TYPES,
  JOURNAL_STATUSES,
} from "../constants/accounting.js";


/* ============================================================
   COMMON VALIDATORS
============================================================ */

const objectId =
  Joi.string()
    .hex()
    .length(24);


const optionalObjectId =
  objectId
    .allow(
      null,
      ""
    );


const optionalText =
  Joi.string()
    .trim()
    .allow(
      "",
      null
    );


/* ============================================================
   JOURNAL LINE
============================================================ */

const journalLineSchema =
  Joi.object({

    accountId:
      objectId
        .required()
        .messages({

          "string.hex":
            "Invalid account ID.",

          "string.length":
            "Invalid account ID.",

          "any.required":
            "Account ID is required.",

        }),


    description:
      optionalText
        .max(500)
        .default(""),


    debit:
      Joi.number()
        .min(0)
        .precision(2)
        .default(0),


    credit:
      Joi.number()
        .min(0)
        .precision(2)
        .default(0),

  })
    .custom(
      (
        value,
        helpers
      ) => {

        const debit =
          Number(
            value.debit ||
            0
          );


        const credit =
          Number(
            value.credit ||
            0
          );


        if (
          debit <= 0 &&
          credit <= 0
        ) {

          return helpers.error(
            "journalLine.amountRequired"
          );
        }


        if (
          debit > 0 &&
          credit > 0
        ) {

          return helpers.error(
            "journalLine.bothSides"
          );
        }


        return value;

      }
    )
    .messages({

      "journalLine.amountRequired":
        "Journal line must contain either a debit or credit amount.",

      "journalLine.bothSides":
        "Journal line cannot contain both debit and credit amounts.",

    });


/* ============================================================
   JOURNAL BODY BALANCE VALIDATION
============================================================ */

const validateBalancedJournal =
  (
    value,
    helpers
  ) => {

    const lines =
      Array.isArray(
        value.lines
      )
        ? value.lines
        : [];


    const totalDebit =
      lines.reduce(
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
      lines.reduce(
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

      return helpers.error(
        "journal.balanceRequired"
      );
    }


    if (
      roundedDebit !==
      roundedCredit
    ) {

      return helpers.error(
        "journal.unbalanced"
      );
    }


    return value;

  };


/* ============================================================
   CREATE JOURNAL ENTRY
============================================================ */

export const createJournalEntrySchema =
  Joi.object({

    journalDate:
      Joi.date()
        .iso()
        .required()
        .messages({

          "date.format":
            "Journal date must be a valid ISO date.",

          "any.required":
            "Journal date is required.",

        }),


    narration:
      optionalText
        .max(1000)
        .default(""),


    referenceType:
      Joi.string()
        .valid(
          ...JOURNAL_REFERENCE_TYPES
        )
        .default(
          "manual"
        ),


    referenceId:
      optionalObjectId
        .default(
          null
        ),


    referenceNo:
      optionalText
        .max(120)
        .default(""),


    lines:
      Joi.array()
        .items(
          journalLineSchema
        )
        .min(2)
        .required()
        .messages({

          "array.min":
            "Journal Entry must contain at least two lines.",

          "any.required":
            "Journal Entry lines are required.",

        }),


    /* ======================================================
       BACKEND CONTROLLED
    ====================================================== */

    journalNumber:
      Joi.forbidden(),


    status:
      Joi.forbidden(),


    totalDebit:
      Joi.forbidden(),


    totalCredit:
      Joi.forbidden(),


    companyId:
      Joi.forbidden(),


    createdBy:
      Joi.forbidden(),


    updatedBy:
      Joi.forbidden(),


    postedBy:
      Joi.forbidden(),


    postedAt:
      Joi.forbidden(),


    voidedBy:
      Joi.forbidden(),


    voidedAt:
      Joi.forbidden(),


    voidReason:
      Joi.forbidden(),

  })
    .custom(
      validateBalancedJournal
    )
    .messages({

      "journal.balanceRequired":
        "Journal Entry must contain debit and credit amounts.",

      "journal.unbalanced":
        "Journal Entry must be balanced: total debit must equal total credit.",

    });


/* ============================================================
   UPDATE JOURNAL ENTRY

   Only DRAFT journal entries will be editable.
   Service layer will enforce draft-only modification.
============================================================ */

export const updateJournalEntrySchema =
  Joi.object({

    journalDate:
      Joi.date()
        .iso(),


    narration:
      optionalText
        .max(1000),


    referenceType:
      Joi.string()
        .valid(
          ...JOURNAL_REFERENCE_TYPES
        ),


    referenceId:
      optionalObjectId,


    referenceNo:
      optionalText
        .max(120),


    lines:
      Joi.array()
        .items(
          journalLineSchema
        )
        .min(2),


    /* ======================================================
       IMMUTABLE / WORKFLOW CONTROLLED
    ====================================================== */

    journalNumber:
      Joi.forbidden(),


    status:
      Joi.forbidden(),


    totalDebit:
      Joi.forbidden(),


    totalCredit:
      Joi.forbidden(),


    companyId:
      Joi.forbidden(),


    createdBy:
      Joi.forbidden(),


    updatedBy:
      Joi.forbidden(),


    postedBy:
      Joi.forbidden(),


    postedAt:
      Joi.forbidden(),


    voidedBy:
      Joi.forbidden(),


    voidedAt:
      Joi.forbidden(),


    voidReason:
      Joi.forbidden(),

  })
    .min(1)
    .custom(
      (
        value,
        helpers
      ) => {

        /*
         * If lines are not being updated,
         * no balance validation is required here.
         */

        if (
          !Object.prototype
            .hasOwnProperty
            .call(
              value,
              "lines"
            )
        ) {

          return value;
        }


        return validateBalancedJournal(
          value,
          helpers
        );

      }
    )
    .messages({

      "journal.balanceRequired":
        "Journal Entry must contain debit and credit amounts.",

      "journal.unbalanced":
        "Journal Entry must be balanced: total debit must equal total credit.",

    });


/* ============================================================
   JOURNAL LIST QUERY
============================================================ */

export const journalEntryQuerySchema =
  Joi.object({

    search:
      optionalText
        .max(160),


    status:
      Joi.string()
        .valid(
          ...JOURNAL_STATUSES
        )
        .allow(
          "",
          null
        ),


    referenceType:
      Joi.string()
        .valid(
          ...JOURNAL_REFERENCE_TYPES
        )
        .allow(
          "",
          null
        ),


    accountId:
      optionalObjectId,


    from:
      Joi.date()
        .iso()
        .allow(
          "",
          null
        ),


    to:
      Joi.date()
        .iso()
        .allow(
          "",
          null
        ),


    sortBy:
      Joi.string()
        .valid(
          "journalNumber",
          "journalDate",
          "status",
          "referenceType",
          "totalDebit",
          "totalCredit",
          "createdAt",
          "updatedAt"
        )
        .default(
          "journalDate"
        ),


    sortOrder:
      Joi.string()
        .valid(
          "asc",
          "desc"
        )
        .default(
          "desc"
        ),

  });


/* ============================================================
   JOURNAL ID PARAM
============================================================ */

export const journalEntryIdParamSchema =
  Joi.object({

    id:
      objectId
        .required()
        .messages({

          "string.hex":
            "Invalid Journal Entry ID.",

          "string.length":
            "Invalid Journal Entry ID.",

          "any.required":
            "Journal Entry ID is required.",

        }),

  });


/* ============================================================
   VOID JOURNAL
============================================================ */

export const voidJournalEntrySchema =
  Joi.object({

    reason:
      Joi.string()
        .trim()
        .min(3)
        .max(1000)
        .required()
        .messages({

          "string.empty":
            "Void reason is required.",

          "string.min":
            "Void reason must contain at least 3 characters.",

          "any.required":
            "Void reason is required.",

        }),

  });


/* ============================================================
   POST JOURNAL

   No client-controlled body is currently required.
============================================================ */

export const postJournalEntrySchema =
  Joi.object({})
    .max(0);