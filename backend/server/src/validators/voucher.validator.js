import Joi from "joi";

import {
  VOUCHER_STATUSES,
  VOUCHER_TYPES,
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
   VOUCHER LINE
============================================================ */

const voucherLineSchema =
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
            "voucherLine.amountRequired"
          );
        }


        if (
          debit > 0 &&
          credit > 0
        ) {

          return helpers.error(
            "voucherLine.bothSides"
          );
        }


        return value;

      }
    )
    .messages({

      "voucherLine.amountRequired":
        "Voucher line must contain either a debit or credit amount.",

      "voucherLine.bothSides":
        "Voucher line cannot contain both debit and credit amounts.",

    });


/* ============================================================
   VOUCHER BALANCE VALIDATION
============================================================ */

const validateBalancedVoucher =
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
        "voucher.balanceRequired"
      );
    }


    if (
      roundedDebit !==
      roundedCredit
    ) {

      return helpers.error(
        "voucher.unbalanced"
      );
    }


    return value;

  };


/* ============================================================
   CREATE VOUCHER
============================================================ */

export const createVoucherSchema =
  Joi.object({

    voucherType:
      Joi.string()
        .valid(
          ...VOUCHER_TYPES
        )
        .required()
        .messages({

          "any.only":
            "Invalid voucher type.",

          "any.required":
            "Voucher type is required.",

        }),


    voucherDate:
      Joi.date()
        .iso()
        .required()
        .messages({

          "date.format":
            "Voucher date must be a valid ISO date.",

          "any.required":
            "Voucher date is required.",

        }),


    narration:
      optionalText
        .max(1000)
        .default(""),


    referenceNo:
      optionalText
        .max(120)
        .default(""),


    referenceDate:
      Joi.date()
        .iso()
        .allow(
          null,
          ""
        )
        .default(
          null
        ),


    partyAccountId:
      optionalObjectId
        .default(
          null
        ),


    lines:
      Joi.array()
        .items(
          voucherLineSchema
        )
        .min(2)
        .required()
        .messages({

          "array.min":
            "Voucher must contain at least two lines.",

          "any.required":
            "Voucher lines are required.",

        }),


    /* ======================================================
       BACKEND CONTROLLED
    ====================================================== */

    voucherNumber:
      Joi.forbidden(),


    financialYear:
      Joi.forbidden(),


    status:
      Joi.forbidden(),


    totalDebit:
      Joi.forbidden(),


    totalCredit:
      Joi.forbidden(),


    companyId:
      Joi.forbidden(),


    journalEntryId:
      Joi.forbidden(),


    sourceModule:
      Joi.forbidden(),


    sourceReferenceId:
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
      validateBalancedVoucher
    )
    .messages({

      "voucher.balanceRequired":
        "Voucher must contain debit and credit amounts.",

      "voucher.unbalanced":
        "Voucher must be balanced: total debit must equal total credit.",

    });


/* ============================================================
   UPDATE VOUCHER

   Only DRAFT vouchers will be editable.
   Service layer will enforce draft-only modification.
============================================================ */

export const updateVoucherSchema =
  Joi.object({

    voucherType:
      Joi.string()
        .valid(
          ...VOUCHER_TYPES
        ),


    voucherDate:
      Joi.date()
        .iso(),


    narration:
      optionalText
        .max(1000),


    referenceNo:
      optionalText
        .max(120),


    referenceDate:
      Joi.date()
        .iso()
        .allow(
          null,
          ""
        ),


    partyAccountId:
      optionalObjectId,


    lines:
      Joi.array()
        .items(
          voucherLineSchema
        )
        .min(2),


    /* ======================================================
       BACKEND / WORKFLOW CONTROLLED
    ====================================================== */

    voucherNumber:
      Joi.forbidden(),


    financialYear:
      Joi.forbidden(),


    status:
      Joi.forbidden(),


    totalDebit:
      Joi.forbidden(),


    totalCredit:
      Joi.forbidden(),


    companyId:
      Joi.forbidden(),


    journalEntryId:
      Joi.forbidden(),


    sourceModule:
      Joi.forbidden(),


    sourceReferenceId:
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


        return validateBalancedVoucher(
          value,
          helpers
        );

      }
    )
    .messages({

      "voucher.balanceRequired":
        "Voucher must contain debit and credit amounts.",

      "voucher.unbalanced":
        "Voucher must be balanced: total debit must equal total credit.",

    });


/* ============================================================
   VOUCHER LIST QUERY
============================================================ */

export const voucherQuerySchema =
  Joi.object({

    search:
      optionalText
        .max(160),


    voucherType:
      Joi.string()
        .valid(
          ...VOUCHER_TYPES
        )
        .allow(
          "",
          null
        ),


    status:
      Joi.string()
        .valid(
          ...VOUCHER_STATUSES
        )
        .allow(
          "",
          null
        ),


    financialYear:
      Joi.string()
        .trim()
        .pattern(
          /^\d{4}-\d{2}$/
        )
        .allow(
          "",
          null
        ),


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
          "voucherNumber",
          "voucherDate",
          "voucherType",
          "financialYear",
          "status",
          "totalDebit",
          "totalCredit",
          "createdAt",
          "updatedAt"
        )
        .default(
          "voucherDate"
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
   VOUCHER ID PARAM
============================================================ */

export const voucherIdParamSchema =
  Joi.object({

    voucherId:
      objectId
        .required()
        .messages({

          "string.hex":
            "Invalid Voucher ID.",

          "string.length":
            "Invalid Voucher ID.",

          "any.required":
            "Voucher ID is required.",

        }),

  });

