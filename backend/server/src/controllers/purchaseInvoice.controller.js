import fs from "fs";
import path from "path";

import purchaseInvoiceService from "../services/purchaseInvoice.service.js";

import {
  createPurchaseInvoiceSchema,
  updatePurchaseInvoiceSchema,
  purchaseInvoiceIdSchema,
  purchaseInvoiceAttachmentIdSchema,
  purchaseInvoiceQuerySchema,
  uploadPurchaseInvoiceAttachmentSchema
} from "../validators/purchaseInvoice.validator.js";

import {
  toPublicPurchaseInvoiceUrl
} from "../middleware/upload.middleware.js";

import {
  ApiResponse
} from "../utils/apiResponse.js";

import {
  ApiError
} from "../utils/apiError.js";

import {
  asyncHandler
} from "../utils/asyncHandler.js";


/* ============================================================
   VALIDATION HELPER
============================================================ */

const validate = (
  schema,
  value
) => {

  const result =
    schema.validate(
      value,
      {
        abortEarly:
          false,

        stripUnknown:
          true,

        convert:
          true
      }
    );


  if (
    result.error
  ) {

    throw new ApiError(
      400,
      result.error.details
        .map(
          row =>
            row.message
        )
        .join(
          ", "
        )
    );

  }


  return result.value;
};


/* ============================================================
   REQUEST HELPERS
============================================================ */

const companyId =
  req =>
    req.purchaseAccess?.companyId;


const userId =
  req =>
    req.user?._id;


/* ============================================================
   FILE CLEANUP HELPERS
============================================================ */

const safeDeleteFile = (
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

      fs.unlinkSync(
        filePath
      );

    }

  }
  catch (
    error
  ) {

    console.error(
      "Failed to remove Purchase Invoice attachment:",
      error?.message ||
      error
    );

  }

};


const purchaseInvoiceUploadRoot =
  path.join(
    process.cwd(),
    "public",
    "uploads",
    "purchase-invoices"
  );


const attachmentDiskPath = (
  attachment
) => {

  const storedFileName =
    String(
      attachment?.storageKey ||
      attachment?.fileName ||
      ""
    )
      .trim();


  if (
    !storedFileName
  ) {

    return "";

  }


  /*
   * storageKey is expected to contain only the generated
   * filename for locally stored Purchase Invoice documents.
   *
   * basename prevents directory traversal if old/bad data
   * ever reaches this helper.
   */

  return path.join(
    purchaseInvoiceUploadRoot,
    path.basename(
      storedFileName
    )
  );

};


/* ============================================================
   CREATE PURCHASE INVOICE
============================================================ */

export const createPurchaseInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const payload =
        validate(
          createPurchaseInvoiceSchema,
          req.body
        );


      const row =
        await purchaseInvoiceService
          .create(
            companyId(
              req
            ),
            userId(
              req
            ),
            payload
          );


      res
        .status(
          201
        )
        .json(
          new ApiResponse(
            201,
            row,
            "Purchase Invoice created and matched."
          )
        );

    }
  );


/* ============================================================
   UPDATE / CORRECT PURCHASE INVOICE
============================================================ */

export const updatePurchaseInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id
      } =
        validate(
          purchaseInvoiceIdSchema,
          req.params
        );


      const payload =
        validate(
          updatePurchaseInvoiceSchema,
          req.body
        );


      const row =
        await purchaseInvoiceService
          .update(
            companyId(
              req
            ),
            id,
            userId(
              req
            ),
            payload
          );


      res.json(
        new ApiResponse(
          200,
          row,
          "Purchase Invoice updated and re-matched."
        )
      );

    }
  );


/* ============================================================
   UPLOAD PURCHASE INVOICE ATTACHMENT

   Important:
   - Actual binary file is NOT stored in MongoDB.
   - Multer stores the file on server disk.
   - MongoDB receives metadata and URL only.
============================================================ */

export const uploadPurchaseInvoiceAttachment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      let uploadedFilePath =
        req.file?.path ||
        "";


      try {

        const {
          id
        } =
          validate(
            purchaseInvoiceIdSchema,
            req.params
          );


        if (
          !req.file
        ) {

          throw new ApiError(
            400,
            "Please select an invoice attachment to upload."
          );

        }


        const payload =
          validate(
            uploadPurchaseInvoiceAttachmentSchema,
            req.body
          );


        const attachment = {

          documentType:
            payload.documentType,

          otherDocumentType:
            payload.otherDocumentType ||
            "",

          fileName:
            req.file.filename,

          originalName:
            req.file.originalname ||
            "",

          fileUrl:
            toPublicPurchaseInvoiceUrl(
              req.file
            ),

          /*
           * For local server storage we keep only generated
           * filename as storageKey. This can later be replaced
           * with an object-storage key without changing the
           * Purchase Invoice schema.
           */
          storageKey:
            req.file.filename,

          mimeType:
            req.file.mimetype,

          fileSize:
            req.file.size,

          uploadedBy:
            userId(
              req
            ),

          uploadedAt:
            new Date()

        };


        const row =
          await purchaseInvoiceService
            .addAttachment(
              companyId(
                req
              ),
              id,
              userId(
                req
              ),
              attachment
            );


        /*
         * Once DB metadata has been saved successfully,
         * controller no longer owns cleanup for this file.
         */
        uploadedFilePath =
          "";


        res
          .status(
            201
          )
          .json(
            new ApiResponse(
              201,
              row,
              "Invoice attachment uploaded successfully."
            )
          );

      }
      catch (
        error
      ) {

        /*
         * Multer saves the physical file before the controller
         * runs. If validation/business logic fails afterwards,
         * remove that newly-created file so orphan files do not
         * accumulate on the server.
         */
        safeDeleteFile(
          uploadedFilePath
        );


        throw error;

      }

    }
  );


/* ============================================================
   DELETE PURCHASE INVOICE ATTACHMENT
============================================================ */

export const deletePurchaseInvoiceAttachment =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id,
        attachmentId
      } =
        validate(
          purchaseInvoiceAttachmentIdSchema,
          req.params
        );


      /*
       * Service removes the metadata from the invoice and
       * returns both:
       *
       * {
       *   invoice,
       *   attachment
       * }
       *
       * Physical file cleanup happens only after DB update
       * succeeds.
       */
      const result =
        await purchaseInvoiceService
          .removeAttachment(
            companyId(
              req
            ),
            id,
            attachmentId,
            userId(
              req
            )
          );


      if (
        result?.attachment
      ) {

        safeDeleteFile(
          attachmentDiskPath(
            result.attachment
          )
        );

      }


      res.json(
        new ApiResponse(
          200,
          result?.invoice ||
          result,
          "Invoice attachment removed successfully."
        )
      );

    }
  );


/* ============================================================
   LIST PURCHASE INVOICES
============================================================ */

export const listPurchaseInvoices =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const query =
        validate(
          purchaseInvoiceQuerySchema,
          req.query
        );


      const rows =
        await purchaseInvoiceService
          .list(
            companyId(
              req
            ),
            query
          );


      res.json(
        new ApiResponse(
          200,
          rows,
          "Purchase Invoices fetched."
        )
      );

    }
  );


/* ============================================================
   GET PURCHASE INVOICE
============================================================ */

export const getPurchaseInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id
      } =
        validate(
          purchaseInvoiceIdSchema,
          req.params
        );


      const row =
        await purchaseInvoiceService
          .getById(
            companyId(
              req
            ),
            id
          );


      if (
        !row
      ) {

        throw new ApiError(
          404,
          "Purchase Invoice not found."
        );

      }


      res.json(
        new ApiResponse(
          200,
          row,
          "Purchase Invoice fetched."
        )
      );

    }
  );


/* ============================================================
   PURCHASE INVOICE REFERENCES
============================================================ */

export const getPurchaseInvoiceReferences =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const references =
        await purchaseInvoiceService
          .references(
            companyId(
              req
            )
          );


      res.json(
        new ApiResponse(
          200,
          references,
          "Invoice references fetched."
        )
      );

    }
  );


/* ============================================================
   ELIGIBLE GRNs FOR PURCHASE ORDER
============================================================ */

export const getPurchaseInvoiceReceipts =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id
      } =
        validate(
          purchaseInvoiceIdSchema,
          req.params
        );


      const receipts =
        await purchaseInvoiceService
          .receipts(
            companyId(
              req
            ),
            id
          );


      res.json(
        new ApiResponse(
          200,
          receipts,
          "Eligible GRNs fetched."
        )
      );

    }
  );


/* ============================================================
   VERIFY PURCHASE INVOICE
============================================================ */

export const verifyPurchaseInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id
      } =
        validate(
          purchaseInvoiceIdSchema,
          req.params
        );


      const row =
        await purchaseInvoiceService
          .verify(
            companyId(
              req
            ),
            id,
            userId(
              req
            )
          );


      res.json(
        new ApiResponse(
          200,
          row,
          "Purchase Invoice verified."
        )
      );

    }
  );


/* ============================================================
   HANDOFF PURCHASE INVOICE TO ACCOUNTS
============================================================ */

export const handoffPurchaseInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id
      } =
        validate(
          purchaseInvoiceIdSchema,
          req.params
        );


      const row =
        await purchaseInvoiceService
          .handoff(
            companyId(
              req
            ),
            id,
            userId(
              req
            )
          );


      res.json(
        new ApiResponse(
          200,
          row,
          "Purchase Invoice handed to Accounts."
        )
      );

    }
  );


/* ============================================================
   PURCHASE INVOICE METRICS
============================================================ */

export const getPurchaseInvoiceMetrics =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const metrics =
        await purchaseInvoiceService
          .metrics(
            companyId(
              req
            )
          );


      res.json(
        new ApiResponse(
          200,
          metrics,
          "Purchase Invoice metrics fetched."
        )
      );

    }
  );