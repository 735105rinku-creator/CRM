import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

import GstReportService from "../services/gstReport.service.js";
import voucherRepository from "../repositories/voucher.repository.js";
import chartOfAccountRepository from "../repositories/chartOfAccount.repository.js";


export class GstReportController {

  constructor({
    gstReportService,
  } = {}) {

    this.gstReportService =
      gstReportService ||
      new GstReportService({
        voucherRepository,
        chartOfAccountRepository,
      });


    this.getGstReport =
      this.getGstReport.bind(
        this
      );
  }


  async getGstReport(
    req,
    res
  ) {

    const companyId =
      req.accountingAccess?.companyId;


    if (
      !companyId
    ) {
      throw new ApiError(
        403,
        "Accounting company context missing."
      );
    }


    const report =
      await this.gstReportService.getGstReport({
        companyId,

        query:
          req.query || {},
      });


    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          report,
          "GST report fetched successfully."
        )
      );
  }
}


const gstReportController =
  new GstReportController();


export const getGstReport =
  gstReportController.getGstReport;


export default
  gstReportController;
