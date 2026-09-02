import { ROLES } from "../constants/roles.js";
import reportService from "../services/logisticsReport.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const companyIdForRequest = req => {
  const auth = req.auth?.companyId || req.user?.companyId?._id || req.user?.companyId;
  if (req.user?.role !== ROLES.SUPER_ADMIN) {
    if (!auth) throw new ApiError(403, "Company context missing");
    return auth;
  }
  const id = req.query?.companyId || auth;
  if (!id) throw new ApiError(400, "companyId is required for Super Admin");
  return id;
};

export const getLogisticsReport = asyncHandler(async (req, res) => {
  const data = await reportService.generate({ companyId: companyIdForRequest(req), query: req.query });
  res.status(200).json(new ApiResponse(200, data, "Logistics report generated successfully"));
});

export const exportLogisticsReportCsv = asyncHandler(async (req, res) => {
  const data = await reportService.generate({ companyId: companyIdForRequest(req), query: req.query });
  const csv = reportService.toCsv(data);
  const name = `logistics-${req.query.reportType || "report"}-${new Date().toISOString().slice(0,10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.status(200).send("\uFEFF" + csv);
});
