import {
  ApiResponse
} from "../utils/apiResponse.js";

import {
  ApiError
} from "../utils/apiError.js";

import OutstandingService
  from "../services/outstanding.service.js";

import chartOfAccountRepository
  from "../repositories/chartOfAccount.repository.js";

import generalLedgerService
  from "../services/generalLedger.service.js";


export class OutstandingController {

  constructor({
    outstandingService,
  }) {

    this.outstandingService =
      outstandingService;

    this.getOutstanding =
      this.getOutstanding.bind(this);

  }


  async getOutstanding(
    req,
    res
  ) {

    const companyId =
      req.accountingAccess?.companyId;


    if (!companyId) {
      throw new ApiError(
        403,
        "Accounting company context missing."
      );
    }


    const data =
      await this.outstandingService
        .getOutstanding({
          companyId,
          query: req.query || {},
        });


    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          data,
          "Outstanding report fetched successfully."
        )
      );

  }

}


const outstandingService =
  new OutstandingService({
    chartOfAccountRepository,
    generalLedgerService,
  });


export const outstandingController =
  new OutstandingController({
    outstandingService,
  });


export const getOutstanding =
  outstandingController
    .getOutstanding;


export default
  outstandingController;
