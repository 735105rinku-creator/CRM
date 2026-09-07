import fs from "fs";
import path from "path";

import { ROLES }
  from "../constants/roles.js";

import {
  createLogisticsVendorPaymentSchema,
  updateLogisticsVendorPaymentSchema,
  addVendorPaymentTransactionSchema,
  logisticsVendorPaymentQuerySchema,
} from "../validators/logisticsVendorPayment.validator.js";

import logisticsVendorPaymentService
  from "../services/logisticsVendorPayment.service.js";

import LogisticsVendor
  from "../models/LogisticsVendor.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";

import {
  toPublicVendorPaymentProofUrl,
} from "../middleware/upload.middleware.js";


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


/* ============================================================
   VALIDATION HELPER
============================================================ */

function validate(
  schema,
  source
) {

  const {
    value,
    error,
  } =
    schema.validate(
      source,
      {
        abortEarly:
          false,

        stripUnknown:
          true,
      }
    );


  if (error) {

    throw new ApiError(
      400,
      error.details[0]
        .message,
      error.details
    );
  }


  return value;
}


/* ============================================================
   OPTIONAL PAYMENT PROOF

   Actual file is stored under:

   public/uploads/vendor-payment-proofs/

   MongoDB stores only:
   - URL
   - original filename
   - MIME type
   - file size
============================================================ */

const paymentProofFromRequest = (
  req
) => {

  const file =
    req.file;


  if (!file) {

    return undefined;
  }


  return {

    url:
      toPublicVendorPaymentProofUrl(
        file
      ),


    originalName:
      String(
        file.originalname ||
        ""
      ),


    mimeType:
      String(
        file.mimetype ||
        ""
      ),


    size:
      Number(
        file.size ||
        0
      ),
  };
};


/* ============================================================
   PAYMENT PROOF FILE PATH

   Important:
   Only files inside:

   public/uploads/vendor-payment-proofs/

   can be downloaded through Vendor Payment endpoint.
============================================================ */

const resolvePaymentProofFile = (
  proof
) => {

  const url =
    String(
      proof?.url ||
      ""
    )
      .trim();


  if (!url) {

    throw new ApiError(
      404,
      "Payment proof not found"
    );
  }


  const normalizedUrl =
    url
      .replace(
        /\\/g,
        "/"
      )
      .replace(
        /^\/+/,
        ""
      );


  const expectedPrefix =
    "uploads/vendor-payment-proofs/";


  if (
    !normalizedUrl.startsWith(
      expectedPrefix
    )
  ) {

    throw new ApiError(
      400,
      "Invalid payment proof path"
    );
  }


  const fileName =
    path.basename(
      normalizedUrl
    );


  if (!fileName) {

    throw new ApiError(
      400,
      "Invalid payment proof file"
    );
  }


  const uploadDirectory =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      "vendor-payment-proofs"
    );


  const filePath =
    path.resolve(
      uploadDirectory,
      fileName
    );


  /*
   * Path traversal safety.
   */

  if (
    path.dirname(
      filePath
    ) !==
    uploadDirectory
  ) {

    throw new ApiError(
      400,
      "Invalid payment proof path"
    );
  }


  return {
    filePath,
    fileName,
  };
};


/* ============================================================
   VENDOR OPTIONS FOR VENDOR PAYMENT

   IMPORTANT:
   This is intentionally a limited read-only lookup.

   It does NOT expose the complete Vendor Master API.

   Vendor Payment employees only receive the fields required
   to select an existing Vendor safely.

   Mongo ObjectId remains internal and is sent by Angular
   automatically when the user selects a Vendor name.
============================================================ */

export const getLogisticsVendorPaymentVendorOptions =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const companyId =
        companyIdForRequest(
          req
        );


      const filter = {

        companyId,


        /*
         * Vendor Master uses status in existing frontend/API.
         *
         * We intentionally allow records where status is either
         * active or not present, so older vendor records remain
         * usable without any DB migration.
         */

        $or: [

          {
            status:
              "active",
          },

          {
            status: {
              $exists:
                false,
            },
          },

          {
            status:
              "",
          },

        ],
      };


      const vendors =
        await LogisticsVendor
          .find(
            filter
          )
          .select(
            [
              "_id",
              "vendorCode",
              "vendorName",
              "companyName",
              "contactPerson",
              "mobile",
              "email",
              "gstNumber",
              "paymentTerms",
              "openingPayable",
              "status",
            ].join(
              " "
            )
          )
          .sort({
            vendorName:
              1,

            companyName:
              1,
          })
          .limit(
            500
          )
          .lean();


      const options =
        vendors.map(
          (
            vendor
          ) => ({

            _id:
              vendor._id,


            vendorCode:
              vendor.vendorCode ||
              "",


            vendorName:
              vendor.vendorName ||
              vendor.companyName ||
              "Vendor",


            companyName:
              vendor.companyName ||
              "",


            contactPerson:
              vendor.contactPerson ||
              "",


            mobile:
              vendor.mobile ||
              "",


            email:
              vendor.email ||
              "",


            gstNumber:
              vendor.gstNumber ||
              "",


            paymentTerms:
              vendor.paymentTerms ||
              "",


            openingPayable:
              Number(
                vendor.openingPayable ||
                0
              ),


            status:
              vendor.status ||
              "active",
          })
        );


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            {
              vendors:
                options,
            },
            "Vendor payment vendor options fetched successfully"
          )
        );
    }
  );


/* ============================================================
   CREATE VENDOR PAYMENT
============================================================ */

export const createLogisticsVendorPayment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const payload =
        validate(
          createLogisticsVendorPaymentSchema,
          req.body
        );


      const paymentProof =
        paymentProofFromRequest(
          req
        );


      const result =
        await logisticsVendorPaymentService
          .createPaymentRecord({

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


            payload,


            paymentProof,
          });


      res
        .status(
          201
        )
        .json(
          new ApiResponse(
            201,
            result,
            "Vendor payment record created successfully"
          )
        );
    }
  );


/* ============================================================
   LIST VENDOR PAYMENTS
============================================================ */

export const getLogisticsVendorPayments =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const query =
        validate(
          logisticsVendorPaymentQuerySchema,
          req.query
        );


      const result =
        await logisticsVendorPaymentService
          .listPaymentRecords({

            companyId:
              companyIdForRequest(
                req
              ),


            query,
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Vendor payment records fetched successfully"
          )
        );
    }
  );


/* ============================================================
   VENDOR PAYMENT SUMMARY
============================================================ */

export const getLogisticsVendorPaymentSummary =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const result =
        await logisticsVendorPaymentService
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
            "Vendor payment summary fetched successfully"
          )
        );
    }
  );


/* ============================================================
   GET VENDOR PAYMENT BY ID
============================================================ */

export const getLogisticsVendorPaymentById =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const result =
        await logisticsVendorPaymentService
          .getPaymentRecord({

            companyId:
              companyIdForRequest(
                req
              ),


            paymentId:
              req.params.id,
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Vendor payment record fetched successfully"
          )
        );
    }
  );


/* ============================================================
   DOWNLOAD PAYMENT PROOF

   Security:
   - Uses current tenant/company context.
   - Payment record must belong to current company.
   - Route should also use Vendor Payment "view" permission.
   - Only vendor-payment-proofs directory is accessible.
============================================================ */

export const downloadLogisticsVendorPaymentProof =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const payment =
        await logisticsVendorPaymentService
          .getPaymentRecord({

            companyId:
              companyIdForRequest(
                req
              ),


            paymentId:
              req.params.id,
          });


      const proof =
        payment?.paymentProof;


      if (
        !proof?.url
      ) {

        throw new ApiError(
          404,
          "Payment proof not found"
        );
      }


      const {
        filePath,
        fileName,
      } =
        resolvePaymentProofFile(
          proof
        );


      if (
        !fs.existsSync(
          filePath
        )
      ) {

        throw new ApiError(
          404,
          "Payment proof file not found"
        );
      }


      const stat =
        fs.statSync(
          filePath
        );


      if (
        !stat.isFile()
      ) {

        throw new ApiError(
          404,
          "Payment proof file not found"
        );
      }


      const originalName =
        String(
          proof.originalName ||
          fileName ||
          "payment-proof"
        )
          .replace(
            /[\r\n"]/g,
            ""
          )
          .trim() ||
        "payment-proof";


      return res.download(
        filePath,
        originalName
      );
    }
  );


/* ============================================================
   UPDATE VENDOR PAYMENT
============================================================ */

export const updateLogisticsVendorPayment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const payload =
        validate(
          updateLogisticsVendorPaymentSchema,
          req.body
        );


      const paymentProof =
        paymentProofFromRequest(
          req
        );


      const result =
        await logisticsVendorPaymentService
          .updatePaymentRecord({

            companyId:
              companyIdForRequest(
                req
              ),


            paymentId:
              req.params.id,


            userId:
              req.user?._id ||
              null,


            payload,


            paymentProof,
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Vendor payment record updated successfully"
          )
        );
    }
  );


/* ============================================================
   ADD PAYMENT TRANSACTION
============================================================ */

export const addLogisticsVendorPaymentTransaction =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const payload =
        validate(
          addVendorPaymentTransactionSchema,
          req.body
        );


      const result =
        await logisticsVendorPaymentService
          .addPayment({

            companyId:
              companyIdForRequest(
                req
              ),


            paymentId:
              req.params.id,


            userId:
              req.user?._id ||
              null,


            payload,
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Vendor payment added successfully"
          )
        );
    }
  );


/* ============================================================
   DELETE VENDOR PAYMENT
============================================================ */

export const deleteLogisticsVendorPayment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const result =
        await logisticsVendorPaymentService
          .deletePaymentRecord({

            companyId:
              companyIdForRequest(
                req
              ),


            paymentId:
              req.params.id,


            userId:
              req.user?._id ||
              null,
          });


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Vendor payment record deleted successfully"
          )
        );
    }
  );