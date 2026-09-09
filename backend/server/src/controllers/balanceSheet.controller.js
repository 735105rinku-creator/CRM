import { TrialBalanceRepository } from "../repositories/trialBalance.repository.js";
import { TrialBalanceService } from "../services/trialBalance.service.js";
import { BalanceSheetService } from "../services/balanceSheet.service.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const repository =
  new TrialBalanceRepository();


const trialBalanceService =
  new TrialBalanceService({
    chartOfAccountRepository:
      repository,

    journalEntryRepository:
      repository,
  });


const service =
  new BalanceSheetService({
    trialBalanceService,
  });


const companyIdOf = (
  req
) => {

  return (
    req.accountingAccess?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId
  );

};


export class BalanceSheetController {

  constructor({
    balanceSheetService = service,
  } = {}) {

    this.balanceSheetService =
      balanceSheetService;

  }


  getBalanceSheet =
    asyncHandler(
      async (
        req,
        res
      ) => {

        const companyId =
          companyIdOf(req);


        if (!companyId) {

          throw new ApiError(
            403,
            "Accounting company context missing."
          );

        }


        const data =
          await this.balanceSheetService
            .getBalanceSheet({
              companyId,

              asOf:
                req.query?.asOf,
            });


        return res.json(
          new ApiResponse(
            200,
            data,
            "Balance Sheet fetched successfully."
          )
        );

      }
    );

}
