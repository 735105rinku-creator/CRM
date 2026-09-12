import { ROLES }
  from "../constants/roles.js";

import reportService
  from "../services/logisticsReport.service.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";


/* ============================================================
   COMPANY CONTEXT
============================================================ */

const companyIdForRequest = (
  req
) => {

  const authCompanyId =
    req.auth?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId;


  if (
    req.user?.role !==
    ROLES.SUPER_ADMIN
  ) {

    if (
      !authCompanyId
    ) {

      throw new ApiError(
        403,
        "Company context missing"
      );
    }


    return authCompanyId;
  }


  const requestedCompanyId =
    req.query?.companyId ||
    authCompanyId;


  if (
    !requestedCompanyId
  ) {

    throw new ApiError(
      400,
      "companyId is required for Super Admin"
    );
  }


  return requestedCompanyId;
};


/* ============================================================
   REPORT REQUESTER CONTEXT
============================================================ */

const requesterContextForReport = (
  req
) => {

  const logisticsAccess =
    req.logisticsAccess ||
    {};


  return {

    userId:
      req.user?._id ||
      req.user?.id ||
      null,

    userRole:
      req.user?.role ||
      null,

    accessType:
      logisticsAccess.accessType ||
      null,

    employeeId:
      logisticsAccess.employeeId ||
      null,

    employeeCode:
      logisticsAccess.employeeCode ||
      null,

    organizationRole:
      logisticsAccess.organizationRole ||
      null,

    canMonitor:
      logisticsAccess.canMonitor ===
      true,

    canManage:
      logisticsAccess.canManage ===
      true,

    canHandoffToAccounts:
      logisticsAccess.canHandoffToAccounts ===
      true,
  };
};


/* ============================================================
   GET REPORT
============================================================ */

export const getLogisticsReport =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await reportService
          .generate({

            companyId:
              companyIdForRequest(
                req
              ),

            query:
              req.query,

            requester:
              requesterContextForReport(
                req
              ),
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            data,
            "Logistics report generated successfully"
          )
        );
    }
  );


/* ============================================================
   EXPORT CSV
============================================================ */

export const exportLogisticsReportCsv =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await reportService
          .generate({

            companyId:
              companyIdForRequest(
                req
              ),

            query:
              req.query,

            requester:
              requesterContextForReport(
                req
              ),
          });


      const csv =
        reportService
          .toCsv(
            data
          );


      const name =
        `logistics-${
          req.query.reportType ||
          "report"
        }-${
          new Date()
            .toISOString()
            .slice(
              0,
              10
            )
        }.csv`;


      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );


      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${name}"`
      );


      res
        .status(
          200
        )
        .send(
          "\uFEFF" +
          csv
        );
    }
  );