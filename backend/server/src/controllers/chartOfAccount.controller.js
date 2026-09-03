import {
  createChartOfAccountSchema,
  updateChartOfAccountSchema,
  chartOfAccountQuerySchema,
  chartOfAccountIdParamSchema,
} from "../validators/chartOfAccount.validator.js";

import chartOfAccountService
  from "../services/chartOfAccount.service.js";

import {
  ApiResponse,
} from "../utils/apiResponse.js";

import {
  ApiError,
} from "../utils/apiError.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";


/* ============================================================
   COMPANY CONTEXT

   Chart of Accounts routes will be mounted AFTER the existing
   accounting access middleware.

   Therefore req.accountingAccess.companyId is mandatory.

   This prevents accidentally exposing Chart of Accounts merely
   because a user is authenticated.
============================================================ */

const companyIdForRequest =
  (
    req
  ) => {

    const companyId =
      req.accountingAccess
        ?.companyId;


    if (
      !companyId
    ) {

      throw new ApiError(
        403,
        "Accounting company context is required."
      );
    }


    return companyId;
  };


/* ============================================================
   VALIDATION HELPER
============================================================ */

const validate =
  (
    schema,
    source
  ) => {

    const {
      value,
      error,
    } =
      schema.validate(
        source,
        {
          abortEarly:
            false,

          stripUnknown:
            false,

          convert:
            true,
        }
      );


    if (
      error
    ) {

      throw new ApiError(
        400,
        error.details[0]
          .message,
        error.details
      );
    }


    return value;
  };


/* ============================================================
   CREATE CHART OF ACCOUNT
============================================================ */

export const
  createChartOfAccount =
    asyncHandler(
      async (
        req,
        res
      ) => {

        const payload =
          validate(
            createChartOfAccountSchema,
            req.body ||
              {}
          );


        const account =
          await chartOfAccountService
            .createAccount({

              companyId:
                companyIdForRequest(
                  req
                ),

              userId:
                req.user?._id ||
                null,

              payload,

            });


        return res
          .status(
            201
          )
          .json(
            new ApiResponse(
              201,
              account,
              "Chart of Account created successfully."
            )
          );
      }
    );


/* ============================================================
   LIST CHART OF ACCOUNTS

   Important response contract:

   ApiResponse.data = ChartOfAccount[]

   The Angular ApiService unwraps .data automatically,
   therefore ChartOfAccountsService receives an array directly.
============================================================ */

export const
  getChartOfAccounts =
    asyncHandler(
      async (
        req,
        res
      ) => {

        const query =
          validate(
            chartOfAccountQuerySchema,
            req.query ||
              {}
          );


        const accounts =
          await chartOfAccountService
            .listAccounts({

              companyId:
                companyIdForRequest(
                  req
                ),

              query,

            });


        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              accounts,
              "Chart of Accounts fetched successfully."
            )
          );
      }
    );


/* ============================================================
   CHART OF ACCOUNTS SUMMARY
============================================================ */

export const
  getChartOfAccountSummary =
    asyncHandler(
      async (
        req,
        res
      ) => {

        const summary =
          await chartOfAccountService
            .getSummary({

              companyId:
                companyIdForRequest(
                  req
                ),

            });


        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              summary,
              "Chart of Accounts summary fetched successfully."
            )
          );
      }
    );


/* ============================================================
   GET ONE ACCOUNT
============================================================ */

export const
  getChartOfAccountById =
    asyncHandler(
      async (
        req,
        res
      ) => {

        const params =
          validate(
            chartOfAccountIdParamSchema,
            req.params ||
              {}
          );


        const account =
          await chartOfAccountService
            .getAccount({

              companyId:
                companyIdForRequest(
                  req
                ),

              accountId:
                params.id,

            });


        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              account,
              "Chart of Account fetched successfully."
            )
          );
      }
    );


/* ============================================================
   UPDATE ACCOUNT

   Activation / deactivation also uses this endpoint:

   PATCH /:id
   {
     "status": "active"
   }

   or

   {
     "status": "inactive"
   }

   This matches the current Angular service exactly.
============================================================ */

export const
  updateChartOfAccount =
    asyncHandler(
      async (
        req,
        res
      ) => {

        const params =
          validate(
            chartOfAccountIdParamSchema,
            req.params ||
              {}
          );


        const payload =
          validate(
            updateChartOfAccountSchema,
            req.body ||
              {}
          );


        const account =
          await chartOfAccountService
            .updateAccount({

              companyId:
                companyIdForRequest(
                  req
                ),

              accountId:
                params.id,

              userId:
                req.user?._id ||
                null,

              payload,

            });


        return res
          .status(
            200
          )
          .json(
            new ApiResponse(
              200,
              account,
              "Chart of Account updated successfully."
            )
          );
      }
    );