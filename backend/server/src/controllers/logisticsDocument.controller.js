import path from "path";
import fs from "fs";

import { ROLES } from "../constants/roles.js";

import {
  createLogisticsDocumentSchema,
  updateLogisticsDocumentSchema,
  logisticsDocumentQuerySchema,
} from "../validators/logisticsDocument.validator.js";

import logisticsDocumentService
  from "../services/logisticsDocument.service.js";

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
    req.body?.companyId ||
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
   CREATE / UPLOAD
============================================================ */

export const uploadLogisticsDocument =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        createLogisticsDocumentSchema
          .validate(
            req.body,
            {
              abortEarly:
                false,

              stripUnknown:
                true,
            }
          );


      if (
        error
      ) {

        /*
         * Remove already-uploaded file when metadata fails.
         */
        if (
          req.file?.path
        ) {
          safeDeleteFile(
            req.file.path
          );
        }


        throw new ApiError(
          400,
          error.details[0]
            .message,
          error.details
        );
      }


      if (
        !req.file
      ) {

        throw new ApiError(
          400,
          "Document file is required"
        );
      }


      try {

        const document =
          await logisticsDocumentService
            .createDocument({

              companyId:
                companyIdForRequest(
                  req
                ),

              userId:
                req.user?._id ||
                null,

              employeeId:
                req.logisticsAccess
                  ?.employeeId ||
                null,

              payload:
                value,

              file:
                req.file,
            });


        res
          .status(
            201
          )
          .json(
            new ApiResponse(
              201,
              document,
              "Logistics document uploaded successfully"
            )
          );

      } catch (
        error
      ) {

        /*
         * Database / shipment validation failed after multer
         * already stored the physical file.
         */
        if (
          req.file?.path
        ) {

          safeDeleteFile(
            req.file.path
          );
        }


        throw error;
      }
    }
  );


/* ============================================================
   LIST
============================================================ */

export const getLogisticsDocuments =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        logisticsDocumentQuerySchema
          .validate(
            req.query,
            {
              abortEarly:
                false,

              stripUnknown:
                true,
            }
          );


      if (
        error
      ) {

        throw new ApiError(
          400,
          error.details[0]
            .message,
          error.details
        );
      }


      const result =
        await logisticsDocumentService
          .listDocuments({

            companyId:
              companyIdForRequest(
                req
              ),

            query:
              value,
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics documents fetched successfully"
          )
        );
    }
  );


/* ============================================================
   SUMMARY
============================================================ */

export const getLogisticsDocumentSummary =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const result =
        await logisticsDocumentService
          .getSummary({

            companyId:
              companyIdForRequest(
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
            result,
            "Logistics document summary fetched successfully"
          )
        );
    }
  );


/* ============================================================
   GET ONE
============================================================ */

export const getLogisticsDocumentById =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const document =
        await logisticsDocumentService
          .getDocument({

            companyId:
              companyIdForRequest(
                req
              ),

            documentId:
              req.params.id,
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            document,
            "Logistics document fetched successfully"
          )
        );
    }
  );


/* ============================================================
   UPDATE METADATA
============================================================ */

export const updateLogisticsDocument =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        value,
        error,
      } =
        updateLogisticsDocumentSchema
          .validate(
            req.body,
            {
              abortEarly:
                false,

              stripUnknown:
                true,
            }
          );


      if (
        error
      ) {

        throw new ApiError(
          400,
          error.details[0]
            .message,
          error.details
        );
      }


      const document =
        await logisticsDocumentService
          .updateDocument({

            companyId:
              companyIdForRequest(
                req
              ),

            documentId:
              req.params.id,

            userId:
              req.user?._id ||
              null,

            payload:
              value,
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            document,
            "Logistics document updated successfully"
          )
        );
    }
  );


/* ============================================================
   DELETE
============================================================ */

export const deleteLogisticsDocument =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const document =
        await logisticsDocumentService
          .getDocument({

            companyId:
              companyIdForRequest(
                req
              ),

            documentId:
              req.params.id,
          });


      const result =
        await logisticsDocumentService
          .deleteDocument({

            companyId:
              companyIdForRequest(
                req
              ),

            documentId:
              req.params.id,

            userId:
              req.user?._id ||
              null,
          });


      /*
       * Only remove the physical file after the DB record
       * has been soft-deleted successfully.
       */
      if (
        document?.filePath
      ) {

        safeDeleteFile(
          document.filePath
        );
      }


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Logistics document deleted successfully"
          )
        );
    }
  );


/* ============================================================
   PREVIEW
============================================================ */

export const previewLogisticsDocument =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const document =
        await logisticsDocumentService
          .getDocument({

            companyId:
              companyIdForRequest(
                req
              ),

            documentId:
              req.params.id,
          });


      const safePath =
        resolveDocumentPath(
          document.filePath
        );


      if (
        !fs.existsSync(
          safePath
        )
      ) {

        throw new ApiError(
          404,
          "Document file not found"
        );
      }


      res.setHeader(
        "Content-Type",
        document.mimeType ||
        "application/octet-stream"
      );


      res.setHeader(
        "Content-Disposition",
        `inline; filename="${safeDownloadName(
          document.originalFileName ||
          document.fileName
        )}"`
      );


      return res.sendFile(
        safePath
      );
    }
  );


/* ============================================================
   DOWNLOAD
============================================================ */

export const downloadLogisticsDocument =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const document =
        await logisticsDocumentService
          .getDocument({

            companyId:
              companyIdForRequest(
                req
              ),

            documentId:
              req.params.id,
          });


      const safePath =
        resolveDocumentPath(
          document.filePath
        );


      if (
        !fs.existsSync(
          safePath
        )
      ) {

        throw new ApiError(
          404,
          "Document file not found"
        );
      }


      return res.download(
        safePath,
        safeDownloadName(
          document.originalFileName ||
          document.fileName
        )
      );
    }
  );


/* ============================================================
   HELPERS
============================================================ */

function safeDeleteFile(
  filePath
) {

  try {

    if (
      filePath &&
      fs.existsSync(
        filePath
      )
    ) {

      fs.unlinkSync(
        filePath
      );
    }

  } catch {
    /*
     * File cleanup must not crash an otherwise valid
     * API response.
     */
  }
}


function resolveDocumentPath(
  filePath
) {

  if (
    !filePath
  ) {

    throw new ApiError(
      404,
      "Document file not found"
    );
  }


  return path.resolve(
    filePath
  );
}


function safeDownloadName(
  value
) {

  return String(
    value ||
    "document"
  )
    .replace(
      /[\r\n"]/g,
      "_"
    );
}