import { TrialBalanceRepository } from "../repositories/trialBalance.repository.js";
import { TrialBalanceService } from "../services/trialBalance.service.js";
import { ProfitLossService } from "../services/profitLoss.service.js";
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
  new ProfitLossService({
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


export class ProfitLossController {

  constructor({
    profitLossService = service,
  } = {}) {

    this.profitLossService =
      profitLossService;

  }


  getProfitLoss =
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
          await this.profitLossService
            .getProfitLoss({
              companyId,

              from:
                req.query?.from,

              to:
                req.query?.to,
            });


        return res.json(
          new ApiResponse(
            200,
            data,
            "Profit & Loss fetched successfully."
          )
        );

      }
    );

}
