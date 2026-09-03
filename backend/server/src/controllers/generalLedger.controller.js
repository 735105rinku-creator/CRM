import * as chartOfAccountRepository
  from "../repositories/chartOfAccount.repository.js";

import * as journalEntryRepository
  from "../repositories/journalEntry.repository.js";

import {
  GeneralLedgerService,
} from "../services/generalLedger.service.js";

import {
  ApiResponse,
} from "../utils/apiResponse.js";

import {
  ApiError,
} from "../utils/apiError.js";

import {
  asyncHandler,
} from "../utils/asyncHandler.js";


/* =========================================================
   SERVICE
========================================================= */

const generalLedgerService =
  new GeneralLedgerService({
    chartOfAccountRepository,
    journalEntryRepository,
  });


/* =========================================================
   COMPANY CONTEXT
========================================================= */

const companyIdForRequest =
  (
    req
  ) => {

    const companyId =
      req.accountingAccess
        ?.companyId ||
      req.auth
        ?.companyId ||
      req.user
        ?.companyId
        ?._id ||
      req.user
        ?.companyId;


    if (
      !companyId
    ) {

      throw new ApiError(
        403,
        "Accounting company context missing."
      );

    }


    return companyId;

  };


/* =========================================================
   GET GENERAL LEDGER

   GET
   /accounting/general-ledger
========================================================= */

export const getGeneralLedger =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const result =
        await generalLedgerService
          .getGeneralLedger({

            companyId:
              companyIdForRequest(
                req
              ),

            query:
              req.query ||
              {},

          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "General Ledger fetched successfully."
          )
        );

    }
  );


/* =========================================================
   GET ACCOUNT LEDGER

   GET
   /accounting/general-ledger/:accountId
========================================================= */

export const getAccountLedger =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const accountId =
        String(
          req.params
            ?.accountId ||
          ""
        )
          .trim();


      if (
        !accountId
      ) {

        throw new ApiError(
          400,
          "Account ID is required."
        );

      }


      const result =
        await generalLedgerService
          .getAccountLedger({

            companyId:
              companyIdForRequest(
                req
              ),

            accountId,

            query:
              req.query ||
              {},

          });


      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Account Ledger fetched successfully."
          )
        );

    }
  );