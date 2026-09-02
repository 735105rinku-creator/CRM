import { ApiError } from "../utils/apiError.js";

/* ============================================================
   ATTENDANCE DEVICE DETECTION
============================================================ */

const TABLET_DEVICE_REGEX = /ipad|tablet|kindle|silk/i;
const MOBILE_DEVICE_REGEX =
  /android|iphone|ipod|mobile|windows phone|blackberry|opera mini|opera mobi|iemobile/i;

export const requireDesktopAttendance = (req, _res, next) => {
  const userAgent = String(req.get("user-agent") || "").trim();

  if (!userAgent) {
    throw new ApiError(403, "Attendance device could not be verified.");
  }

  const clientHintMobile = String(req.get("sec-ch-ua-mobile") || "")
    .trim()
    .toLowerCase();

  const isClientHintMobile =
    clientHintMobile === "?1" ||
    clientHintMobile === "1" ||
    clientHintMobile === "true";

  const isTablet = TABLET_DEVICE_REGEX.test(userAgent);
  const isMobile = !isTablet && (MOBILE_DEVICE_REGEX.test(userAgent) || isClientHintMobile);

  req.attendanceDevice = {
    allowed: true,
    type: isTablet ? "tablet" : isMobile ? "mobile" : "desktop",
    userAgent,
    clientHintMobile: clientHintMobile || null,
    ip: req.ip || null,
  };

  next();
};

export default requireDesktopAttendance;

