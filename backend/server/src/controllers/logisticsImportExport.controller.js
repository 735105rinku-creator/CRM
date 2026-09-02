import { ROLES } from "../constants/roles.js";

import logisticsImportExportService
  from "../services/logisticsImportExport.service.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";

const companyIdForRequest = (req) => {
  const authCompanyId =
    req.auth?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId;

  if (
    req.user?.role !==
    ROLES.SUPER_ADMIN
  ) {
    if (!authCompanyId) {
      throw new ApiError(
        403,
        "Company context missing"
      );
    }

    return authCompanyId;
  }

  const requestedCompanyId =
    req.query?.companyId ||
    req.body?.companyId ||
    authCompanyId;

  if (!requestedCompanyId) {
    throw new ApiError(
      400,
      "companyId is required for Super Admin"
    );
  }

  return requestedCompanyId;
};

export const downloadImportTemplate =
  asyncHandler(async (req, res) => {
    const moduleName =
      req.params.module;

    const format =
      req.query.format ||
      "xlsx";

    const file =
      logisticsImportExportService
        .template(
          moduleName,
          format
        );

    res.setHeader(
      "Content-Type",
      file.contentType
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${moduleName}-import-template.${file.extension}"`
    );

    res.status(200).send(
      file.buffer
    );
  });

export const importLogisticsData =
  asyncHandler(async (req, res) => {
    if (!req.file?.buffer) {
      throw new ApiError(
        400,
        "Import file is required. Use multipart field name: file"
      );
    }

    const result =
      await logisticsImportExportService
        .importModule({
          companyId:
            companyIdForRequest(req),

          userId:
            req.user?._id ||
            null,

          employeeId:
            req.logisticsAccess
              ?.employeeId ||
            null,

          moduleName:
            req.params.module,

          buffer:
            req.file.buffer,
        });

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        "Logistics import completed"
      )
    );
  });

export const exportLogisticsData =
  asyncHandler(async (req, res) => {
    const moduleName =
      req.params.module;

    const format =
      req.query.format ||
      "xlsx";

    const file =
      await logisticsImportExportService
        .exportModule({
          companyId:
            companyIdForRequest(req),

          moduleName,

          format,
        });

    const date =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    res.setHeader(
      "Content-Type",
      file.contentType
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${moduleName}-export-${date}.${file.extension}"`
    );

    res.status(200).send(
      file.buffer
    );
  });
