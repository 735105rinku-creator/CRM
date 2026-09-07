import Joi from "joi";

import {
  ACCOUNT_STATUSES,
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

   Same format as Chart of Accounts.
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
   CREATE ACCOUNT PARTY

   Important:
   nature and accountType are NOT accepted from client.

   AccountPartyService decides:

   customer:
     nature      = asset
     accountType = accounts_receivable

   vendor:
     nature      = liability
     accountType = accounts_payable
============================================================ */

export const createAccountPartySchema =
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


    /* ========================================================
       PARTY ACCOUNTING IDENTITY

       Controlled only by AccountPartyService.
    ======================================================== */

    nature:
      Joi.forbidden(),


    accountType:
      Joi.forbidden(),


    /* ========================================================
       BACKEND CONTROLLED
    ======================================================== */

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

  });


/* ============================================================
   UPDATE ACCOUNT PARTY

   Party accounting identity must remain immutable.

   Customer can never be converted into Vendor.
   Vendor can never be converted into Customer.

   Historical party ledgers are preserved by status inactive.
============================================================ */

export const updateAccountPartySchema =
  Joi.object({

    accountName:
      Joi.string()
        .trim()
        .min(1)
        .max(120),


    description:
      optionalText
        .max(500),


    parentAccountId:
      optionalObjectId,


    status:
      Joi.string()
        .valid(
          ...ACCOUNT_STATUSES
        ),


    /* ========================================================
       IMMUTABLE ACCOUNTING IDENTITY
    ======================================================== */

    accountCode:
      Joi.forbidden()
        .messages({

          "any.unknown":
            "Party account code cannot be changed after creation.",

        }),


    nature:
      Joi.forbidden()
        .messages({

          "any.unknown":
            "Party account nature cannot be changed.",

        }),


    accountType:
      Joi.forbidden()
        .messages({

          "any.unknown":
            "Party account type cannot be changed.",

        }),


    openingBalance:
      Joi.forbidden()
        .messages({

          "any.unknown":
            "Party opening balance cannot be changed after creation.",

        }),


    openingBalanceType:
      Joi.forbidden()
        .messages({

          "any.unknown":
            "Party opening balance type cannot be changed after creation.",

        }),


    /* ========================================================
       BACKEND CONTROLLED
    ======================================================== */

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
   PARTY ROUTE PARAMETER
============================================================ */

export const accountPartyIdParamSchema =
  Joi.object({

    id:
      objectId
        .required()
        .messages({

          "string.hex":
            "Invalid party ID.",

          "string.length":
            "Invalid party ID.",

          "string.empty":
            "Party ID is required.",

          "any.required":
            "Party ID is required.",

        }),

  });
