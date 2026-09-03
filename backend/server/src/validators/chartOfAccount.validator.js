import Joi from "joi";

import {
  ACCOUNT_NATURES,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_NATURE,
  DEBIT_CREDIT_TYPES,
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
   ACCOUNT CODE

   Allowed examples:

   1000
   1000-CASH
   BANK-001
   ASSET/001
   1000.01
============================================================ */

const accountCode =
  Joi.string()
    .trim()
    .uppercase()
    .min(1)
    .max(30)
    .pattern(
      /^[A-Z0-9._/-]+$/
    )
    .messages({

      "string.pattern.base":
        "Account code may contain only letters, numbers, dot, underscore, hyphen and slash.",

    });


/* ============================================================
   CREATE CHART OF ACCOUNT
============================================================ */

export const createChartOfAccountSchema =
  Joi.object({

    accountCode:
      accountCode
        .required(),


    accountName:
      Joi.string()
        .trim()
        .min(1)
        .max(120)
        .required(),


    description:
      optionalText
        .max(500)
        .default(""),


    nature:
      Joi.string()
        .valid(
          ...ACCOUNT_NATURES
        )
        .required(),


    accountType:
      Joi.string()
        .valid(
          ...ACCOUNT_TYPES
        )
        .required(),


    parentAccountId:
      optionalObjectId
        .default(null),


    openingBalance:
      Joi.number()
        .min(0)
        .default(0),


    openingBalanceType:
      Joi.string()
        .valid(
          ...DEBIT_CREDIT_TYPES
        )
        .optional(),


    status:
      Joi.string()
        .valid(
          ...ACCOUNT_STATUSES
        )
        .default("active"),


    /*
     * These fields are controlled only by backend business
     * logic and must never be accepted from normal API input.
     */

    companyId:
      Joi.forbidden(),


    currentBalance:
      Joi.forbidden(),


    isSystemAccount:
      Joi.forbidden(),


    allowManualEntry:
      Joi.forbidden(),


    createdBy:
      Joi.forbidden(),


    updatedBy:
      Joi.forbidden(),

  })
    .custom(
      (
        value,
        helpers
      ) => {

        /* ====================================================
           ACCOUNT TYPE ↔ NATURE VALIDATION
        ==================================================== */

        const expectedNature =
          ACCOUNT_TYPE_NATURE[
            value.accountType
          ];


        if (
          expectedNature &&
          expectedNature !==
            value.nature
        ) {

          return helpers.message({
            custom:
              `Account type "${value.accountType}" belongs to "${expectedNature}" nature, not "${value.nature}".`,
          });

        }


        return value;

      }
    );


/* ============================================================
   UPDATE CHART OF ACCOUNT

   Important immutable fields:

   accountCode
   nature
   openingBalance
   openingBalanceType

   accountType can change, but Service layer must verify that
   the new type still belongs to the account's existing nature.
============================================================ */

export const updateChartOfAccountSchema =
  Joi.object({

    accountName:
      Joi.string()
        .trim()
        .min(1)
        .max(120),


    description:
      optionalText
        .max(500),


    accountType:
      Joi.string()
        .valid(
          ...ACCOUNT_TYPES
        ),


    parentAccountId:
      optionalObjectId,


    status:
      Joi.string()
        .valid(
          ...ACCOUNT_STATUSES
        ),


    /* ---------------- IMMUTABLE ---------------- */

    accountCode:
      Joi.forbidden()
        .messages({
          "any.unknown":
            "Account code cannot be changed after account creation.",
        }),


    nature:
      Joi.forbidden()
        .messages({
          "any.unknown":
            "Account nature cannot be changed after account creation.",
        }),


    openingBalance:
      Joi.forbidden()
        .messages({
          "any.unknown":
            "Opening balance cannot be changed after account creation.",
        }),


    openingBalanceType:
      Joi.forbidden()
        .messages({
          "any.unknown":
            "Opening balance type cannot be changed after account creation.",
        }),


    /* ---------------- BACKEND CONTROLLED ---------------- */

    companyId:
      Joi.forbidden(),


    currentBalance:
      Joi.forbidden(),


    isSystemAccount:
      Joi.forbidden(),


    allowManualEntry:
      Joi.forbidden(),


    createdBy:
      Joi.forbidden(),


    updatedBy:
      Joi.forbidden(),

  })
    .min(1);


/* ============================================================
   CHART OF ACCOUNTS QUERY
============================================================ */

export const chartOfAccountQuerySchema =
  Joi.object({

    search:
      optionalText
        .max(160),


    nature:
      Joi.string()
        .valid(
          ...ACCOUNT_NATURES
        )
        .allow(
          "",
          null
        ),


    accountType:
      Joi.string()
        .valid(
          ...ACCOUNT_TYPES
        )
        .allow(
          "",
          null
        ),


    status:
      Joi.string()
        .valid(
          ...ACCOUNT_STATUSES
        )
        .allow(
          "",
          null
        ),


    parentAccountId:
      optionalObjectId,


    sortBy:
      Joi.string()
        .valid(
          "accountCode",
          "accountName",
          "nature",
          "accountType",
          "status",
          "createdAt",
          "updatedAt"
        )
        .default(
          "accountCode"
        ),


    sortOrder:
      Joi.string()
        .valid(
          "asc",
          "desc"
        )
        .default(
          "asc"
        ),

  });


/* ============================================================
   ROUTE PARAMETER
============================================================ */

export const chartOfAccountIdParamSchema =
  Joi.object({

    id:
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

  });