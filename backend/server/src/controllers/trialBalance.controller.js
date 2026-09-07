import { TrialBalanceRepository } from "../repositories/trialBalance.repository.js";
import { TrialBalanceService } from "../services/trialBalance.service.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const repository =
  new TrialBalanceRepository();


const service =
  new TrialBalanceService({
    chartOfAccountRepository:
      repository,

    journalEntryRepository:
      repository,
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


export class TrialBalanceController {

  constructor({
    trialBalanceService = service,
  } = {}) {

    this.trialBalanceService =
      trialBalanceService;

  }


  getTrialBalance =
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
          await this.trialBalanceService
            .getTrialBalance({
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
            "Trial Balance fetched successfully."
          )
        );

      }
    );

}
