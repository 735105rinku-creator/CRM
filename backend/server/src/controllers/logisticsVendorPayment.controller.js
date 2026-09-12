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
  toPublicLogisticsVendorBillUrl,
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
   REQUEST USER ID

   Supports both:
   - req.user._id
   - req.user.id
============================================================ */

const userIdForRequest = (
  req
) =>
  req.user?._id ||
  req.user?.id ||
  null;


/* ============================================================
   REQUEST EMPLOYEE ID

   Employee workspace identity is preferred for Vendor Payment
   ownership.
============================================================ */

const employeeIdForRequest = (
  req
) =>
  req.logisticsAccess
    ?.employeeId ||
  null;


/* ============================================================
   REQUEST ACCESS TYPE

   Expected middleware values include:
   - employee
   - management
============================================================ */

const accessTypeForRequest = (
  req
) =>
  String(
    req.logisticsAccess
      ?.accessType ||
    ""
  )
    .trim()
    .toLowerCase();


/* ============================================================
   REQUEST ACCOUNTS HANDOFF AUTHORITY

   Department Head / Team Leader only.

   This is intentionally separate from creator ownership.
============================================================ */

const canHandoffForRequest = (
  req
) =>
  Boolean(
    req.logisticsAccess
      ?.canHandoffToAccounts
  );


/* ============================================================
   REQUEST READ ACCESS CONTEXT

   Passed to requester-aware read methods.

   Normal employee:
   - service restricts reads to own workspace

   Department Head / Team Leader:
   - service permits department review

   Management:
   - service permits monitoring visibility
============================================================ */

const readAccessForRequest = (
  req
) => ({
  userId:
    userIdForRequest(
      req
    ),

  employeeId:
    employeeIdForRequest(
      req
    ),

  accessType:
    accessTypeForRequest(
      req
    ),

  canHandoffToAccounts:
    canHandoffForRequest(
      req
    ),
});


/* ============================================================
   REQUEST USER NAME

   Used for:
   - edit history
   - Vendor Bill audit
   - Accounts handoff sender name
============================================================ */

const userNameForRequest = (
  req
) => {

  const firstName =
    String(
      req.user?.firstName ||
      ""
    )
      .trim();


  const lastName =
    String(
      req.user?.lastName ||
      ""
    )
      .trim();


  const fullName =
    [
      firstName,
      lastName,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();


  return String(
    req.user?.name ||
    req.user?.displayName ||
    fullName ||
    req.logisticsAccess
      ?.employeeName ||
    req.logisticsAccess
      ?.employeeCode ||
    req.user?.email ||
    ""
  )
    .trim();
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


  return value;
}


/* ============================================================
   OPTIONAL PAYMENT PROOF

   Actual file:
   public/uploads/vendor-payment-proofs/

   MongoDB stores metadata only.
============================================================ */

const paymentProofFromRequest = (
  req
) => {

  const file =
    req.file;


  if (
    !file
  ) {

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
   VENDOR BILL FROM REQUEST

   Actual file:
   public/uploads/logistics-vendor-bills/

   MongoDB stores metadata/reference only.
============================================================ */

const vendorBillFromRequest = (
  req
) => {

  const file =
    req.file;


  if (
    !file
  ) {

    return null;
  }


  return {

    fileName:
      String(
        file.filename ||
        ""
      ),

    originalName:
      String(
        file.originalname ||
        ""
      ),

    fileUrl:
      toPublicLogisticsVendorBillUrl(
        file
      ),

    storageKey:
      String(
        file.filename ||
        ""
      ),

    mimeType:
      String(
        file.mimetype ||
        ""
      ),

    fileSize:
      Number(
        file.size ||
        0
      ),
  };
};


/* ============================================================
   SAFE UPLOAD FILE RESOLVER
============================================================ */

const resolveUploadFile = ({
  url,
  folder,
  notFoundMessage,
  invalidPathMessage,
}) => {

  const rawUrl =
    String(
      url ||
      ""
    )
      .trim();


  if (
    !rawUrl
  ) {

    throw new ApiError(
      404,
      notFoundMessage
    );
  }


  const normalizedUrl =
    rawUrl
      .replace(
        /\\/g,
        "/"
      )
      .replace(
        /^\/+/,
        ""
      );


  const expectedPrefix =
    `uploads/${folder}/`;


  if (
    !normalizedUrl.startsWith(
      expectedPrefix
    )
  ) {

    throw new ApiError(
      400,
      invalidPathMessage
    );
  }


  const fileName =
    path.basename(
      normalizedUrl
    );


  if (
    !fileName
  ) {

    throw new ApiError(
      400,
      invalidPathMessage
    );
  }


  const uploadDirectory =
    path.resolve(
      process.cwd(),
      "public",
      "uploads",
      folder
    );


  const filePath =
    path.resolve(
      uploadDirectory,
      fileName
    );


  /*
   * Path traversal protection.
   */

  if (
    path.dirname(
      filePath
    ) !==
    uploadDirectory
  ) {

    throw new ApiError(
      400,
      invalidPathMessage
    );
  }


  return {
    filePath,
    fileName,
  };
};


/* ============================================================
   PAYMENT PROOF FILE PATH
============================================================ */

const resolvePaymentProofFile = (
  proof
) =>
  resolveUploadFile({

    url:
      proof?.url,

    folder:
      "vendor-payment-proofs",

    notFoundMessage:
      "Payment proof not found",

    invalidPathMessage:
      "Invalid payment proof path",
  });


/* ============================================================
   VENDOR BILL FILE PATH
============================================================ */

const resolveVendorBillFile = (
  vendorBill
) =>
  resolveUploadFile({

    url:
      vendorBill?.fileUrl,

    folder:
      "logistics-vendor-bills",

    notFoundMessage:
      "Vendor bill not found",

    invalidPathMessage:
      "Invalid vendor bill path",
  });


/* ============================================================
   SAFE PHYSICAL FILE REMOVE
============================================================ */

const removePhysicalFileIfExists = (
  filePath
) => {

  if (
    !filePath
  ) {

    return;
  }


  try {

    if (
      fs.existsSync(
        filePath
      )
    ) {

      const stat =
        fs.statSync(
          filePath
        );


      if (
        stat.isFile()
      ) {

        fs.unlinkSync(
          filePath
        );
      }
    }

  } catch (
    error
  ) {

    console.error(
      "Unable to remove Logistics Vendor Bill physical file:",
      error
    );
  }
};


/* ============================================================
   REMOVE REQUEST-UPLOADED VENDOR BILL
============================================================ */

const cleanupUploadedVendorBill = (
  req
) => {

  const uploadedPath =
    req.file?.path;


  if (
    uploadedPath
  ) {

    removePhysicalFileIfExists(
      path.resolve(
        uploadedPath
      )
    );

    return;
  }


  if (
    req.file?.filename
  ) {

    const fallbackPath =
      path.resolve(
        process.cwd(),
        "public",
        "uploads",
        "logistics-vendor-bills",
        req.file.filename
      );


    removePhysicalFileIfExists(
      fallbackPath
    );
  }
};


/* ============================================================
   VENDOR OPTIONS FOR VENDOR PAYMENT
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
              userIdForRequest(
                req
              ),

            employeeId:
              employeeIdForRequest(
                req
              ),

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

   Requester-aware visibility:

   Junior / Executive:
   - own Vendor Payments only

   Department Head / Team Leader:
   - all Logistics Vendor Payments for review

   Management:
   - monitoring visibility

   Mutation authority remains separate.
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

            ...readAccessForRequest(
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
            "Vendor payment records fetched successfully"
          )
        );
    }
  );


/* ============================================================
   VENDOR PAYMENT SUMMARY

   Summary follows exactly the same visibility as the list.
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

            ...readAccessForRequest(
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

   Junior cannot fetch another employee's record by manually
   entering its ID.

   Senior can review department records.

   Management monitoring visibility is preserved.
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

            ...readAccessForRequest(
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
            "Vendor payment record fetched successfully"
          )
        );
    }
  );


/* ============================================================
   DOWNLOAD PAYMENT PROOF

   Uses requester-aware read access.

   Junior:
   - own payment proof only

   Senior:
   - department record proof review allowed

   Management:
   - monitoring visibility
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

            ...readAccessForRequest(
              req
            ),
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
   UPLOAD / REPLACE VENDOR BILL

   Creator-only mutation.

   IMPORTANT:

   The pre-upload lookup is requester-aware, so a junior cannot
   inspect another employee's record through this endpoint.

   Senior may read/review another employee's Vendor Bill, but
   saveVendorBill() still enforces creator ownership and will
   reject replacement of a junior-created bill.

   If authorization/business validation fails after Multer has
   stored the new file, the newly uploaded physical file is
   removed.
============================================================ */

export const uploadLogisticsVendorPaymentBill =
  asyncHandler(
    async (
      req,
      res
    ) => {

      if (
        !req.file
      ) {

        throw new ApiError(
          400,
          "Vendor bill file is required"
        );
      }


      const companyId =
        companyIdForRequest(
          req
        );


      let previousPayment;


      try {

        previousPayment =
          await logisticsVendorPaymentService
            .getPaymentRecord({

              companyId,

              paymentId:
                req.params.id,

              ...readAccessForRequest(
                req
              ),
            });

      } catch (
        error
      ) {

        cleanupUploadedVendorBill(
          req
        );

        throw error;
      }


      const vendorBillDocument =
        vendorBillFromRequest(
          req
        );


      let result;


      try {

        result =
          await logisticsVendorPaymentService
            .saveVendorBill({

              companyId,

              paymentId:
                req.params.id,

              userId:
                userIdForRequest(
                  req
                ),

              employeeId:
                employeeIdForRequest(
                  req
                ),

              userName:
                userNameForRequest(
                  req
                ),

              vendorBillDocument,
            });

      } catch (
        error
      ) {

        cleanupUploadedVendorBill(
          req
        );

        throw error;
      }


      const previousVendorBill =
        previousPayment
          ?.vendorBillDocument;


      if (
        previousVendorBill?.fileUrl &&
        previousVendorBill.fileUrl !==
          vendorBillDocument.fileUrl
      ) {

        try {

          const previousFile =
            resolveVendorBillFile(
              previousVendorBill
            );


          removePhysicalFileIfExists(
            previousFile.filePath
          );

        } catch (
          error
        ) {

          console.error(
            "Unable to clean previous Logistics Vendor Bill:",
            error
          );
        }
      }


      res
        .status(
          200
        )
        .json(
          new ApiResponse(
            200,
            result,
            "Vendor bill uploaded successfully"
          )
        );
    }
  );


/* ============================================================
   DOWNLOAD VENDOR BILL

   Read access follows workspace visibility:

   Junior:
   - own Vendor Bill only

   Senior:
   - may review/download junior Vendor Bill

   Management:
   - monitoring access preserved
============================================================ */

export const downloadLogisticsVendorPaymentBill =
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

            ...readAccessForRequest(
              req
            ),
          });


      const vendorBill =
        payment
          ?.vendorBillDocument;


      if (
        !vendorBill?.fileUrl
      ) {

        throw new ApiError(
          404,
          "Vendor bill not found"
        );
      }


      const {
        filePath,
        fileName,
      } =
        resolveVendorBillFile(
          vendorBill
        );


      if (
        !fs.existsSync(
          filePath
        )
      ) {

        throw new ApiError(
          404,
          "Vendor bill file not found"
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
          "Vendor bill file not found"
        );
      }


      const originalName =
        String(
          vendorBill.originalName ||
          vendorBill.fileName ||
          fileName ||
          "vendor-bill"
        )
          .replace(
            /[\r\n"]/g,
            ""
          )
          .trim() ||
        "vendor-bill";


      return res.download(
        filePath,
        originalName
      );
    }
  );


/* ============================================================
   SEND VENDOR PAYMENT TO ACCOUNTS

   Department Head / Team Leader only.

   Handoff authority is intentionally independent from creator
   ownership.

   Senior can:
   - review junior-created Vendor Payment
   - view/download its Vendor Bill
   - hand eligible outstanding payable to Accounts

   Senior cannot:
   - edit junior Vendor Payment
   - add direct Logistics payment
   - delete junior Vendor Payment
   - replace junior Vendor Bill
============================================================ */

export const handoffLogisticsVendorPaymentToAccounts =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const result =
        await logisticsVendorPaymentService
          .handoffToAccounts({

            companyId:
              companyIdForRequest(
                req
              ),

            paymentId:
              req.params.id,

            userId:
              userIdForRequest(
                req
              ),

            employeeId:
              employeeIdForRequest(
                req
              ),

            userName:
              userNameForRequest(
                req
              ),

            canHandoffToAccounts:
              canHandoffForRequest(
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
            "Vendor payment sent to Accounts successfully"
          )
        );
    }
  );


/* ============================================================
   UPDATE VENDOR PAYMENT

   Creator identity is passed to service.

   The service performs company-scoped internal lookup first,
   then explicitly enforces creator ownership.

   This prevents Senior review authority from becoming edit
   authority.
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
              userIdForRequest(
                req
              ),

            employeeId:
              employeeIdForRequest(
                req
              ),

            userName:
              userNameForRequest(
                req
              ),

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

   Creator-only before Accounts handoff.
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
              userIdForRequest(
                req
              ),

            employeeId:
              employeeIdForRequest(
                req
              ),

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

   Creator-only before Accounts handoff.
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
              userIdForRequest(
                req
              ),

            employeeId:
              employeeIdForRequest(
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
            "Vendor payment record deleted successfully"
          )
        );
    }
  );