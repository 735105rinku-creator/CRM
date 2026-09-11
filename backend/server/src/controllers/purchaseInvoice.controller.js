import purchaseInvoiceService from "../services/purchaseInvoice.service.js";

import {
  createPurchaseInvoiceSchema,
  updatePurchaseInvoiceSchema,
  purchaseInvoiceIdSchema,
  purchaseInvoiceQuerySchema
} from "../validators/purchaseInvoice.validator.js";

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