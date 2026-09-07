import { chartOfAccountRepository } from "../repositories/chartOfAccount.repository.js";
import { journalEntryRepository } from "../repositories/journalEntry.repository.js";
import { GeneralLedgerService } from "../services/generalLedger.service.js";
import { CashBankBookService } from "../services/cashBankBook.service.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";



const generalLedgerService =
  new GeneralLedgerService({
    chartOfAccountRepository,
    journalEntryRepository,
  });


const service =
  new CashBankBookService({
    chartOfAccountRepository,
    generalLedgerService,
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


export class CashBankBookController {

  constructor({
    cashBankBookService = service,
  } = {}) {

    this.cashBankBookService =
      cashBankBookService;

  }


  getCashBankBook =
    asyncHandler(
      async (
        req,
        res
      ) => {

        const companyId =
          companyIdOf(req);


        if (
          !companyId
        ) {

          throw new ApiError(
            403,
            "Accounting company context missing."
          );

        }


        const data =
          await this.cashBankBookService
            .getCashBankBook({
              companyId,

              query: {
                from:
                  req.query?.from,

                to:
                  req.query?.to,

                accountId:
                  req.query?.accountId,
              },
            });


        return res.json(
          new ApiResponse(
            200,
            data,
            "Cash/Bank Book fetched successfully."
          )
        );

      }
    );

}


export default CashBankBookController;
