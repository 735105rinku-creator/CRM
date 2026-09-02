import { ApiError } from "../utils/apiError.js";

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route Not Found : ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") {
    console.error("[API ERROR]", req.method, req.originalUrl, err?.stack || err?.message || err);
  }
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = [];

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";

    errors = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (["EAUTH", "535", 535].includes(err.code) || err.responseCode === 535 || /535|BadCredentials|Username and Password not accepted/i.test(err.message || "")) {
    statusCode = 502;
    message = "Super Admin Gmail SMTP authentication failed. Please update the Gmail app password and restart backend.";
  }

  if (err.code === 11000) {
    statusCode = 409;

    const duplicateField = Object.keys(err.keyValue || {})[0];

    message = duplicateField
      ? `${duplicateField} already exists.`
      : "Duplicate record found.";

    errors = Object.entries(err.keyValue || {}).map(([field, value]) => ({
      field,
      message: `${field} already exists.`,
      value,
    }));
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
