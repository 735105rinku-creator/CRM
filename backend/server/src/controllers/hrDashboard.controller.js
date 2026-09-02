import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import { getHRDashboardService } from "../services/hrDashboard.service.js";

export const getHRDashboard = asyncHandler(async (req, res) => {
  const data = await getHRDashboardService(req.user);

  res.status(200).json(
    new ApiResponse(200, data, "HR dashboard fetched successfully")
  );
});