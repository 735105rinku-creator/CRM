import Joi from "joi";


/* ============================================================
   COMMON VALIDATORS
============================================================ */

const objectId =
  Joi
    .string()
    .hex()
    .length(
      24
    );


const money =
  Joi
    .number()
    .min(
      0
    )
    .precision(
      2
    );


/* ============================================================
   PURCHASE INVOICE DOCUMENT TYPES
============================================================ */

export const PURCHASE_INVOICE_DOCUMENT_TYPES = [
  "vendor_invoice",
  "e_way_bill",
  "delivery_challan",
  "supporting_document",
  "other",
];


/* ============================================================
   ITEM
============================================================ */

const itemSchema =
  Joi.object({

    purchaseOrderItemId:
      objectId
        .required(),

    invoicedQuantity:
      Joi
        .number()
        .positive()
        .required(),

    unitPrice:
      money
        .required(),

    taxPercent:
      Joi
        .number()
        .min(
          0
        )
        .max(
          100
        )
        .default(
          0
        )

  })
    .unknown(
      false
    );


/* ============================================================
   CREATE PURCHASE INVOICE
============================================================ */

export const createPurchaseInvoiceSchema =
  Joi.object({

    purchaseOrderId:
      objectId
        .required(),

    goodsReceiptIds:
      Joi
        .array()
        .items(
          objectId
        )
        .min(
          1
        )
        .unique()
        .required(),

    vendorInvoiceNumber:
      Joi
        .string()
        .trim()
        .max(
          120
        )
        .required(),

    invoiceDate:
      Joi
        .date()
        .iso()
        .required(),

    receivedDate:
      Joi
        .date()
        .iso()
        .default(
          () =>
            new Date()
        ),

    items:
      Joi
        .array()
        .items(
          itemSchema
        )
        .min(
          1
        )
        .required(),

    freightCharges:
      money
        .default(
          0
        ),

    otherCharges:
      money
        .default(
          0
        ),

    declaredInvoiceTotal:
      money
        .required(),

    remarks:
      Joi
        .string()
        .trim()
        .max(
          1500
        )
        .allow(
          ""
        )
        .default(
          ""
        )

  })
    .unknown(
      false
    );


/* ============================================================
   UPDATE PURCHASE INVOICE

   Used only before verification / Accounts handoff.
   Same business fields are validated as create flow so the
   service can safely re-run complete 3-way matching.
============================================================ */

export const updatePurchaseInvoiceSchema =
  Joi.object({

    purchaseOrderId:
      objectId
        .required(),

    goodsReceiptIds:
      Joi
        .array()
        .items(
          objectId
        )
        .min(
          1
        )
        .unique()
        .required(),

    vendorInvoiceNumber:
      Joi
        .string()
        .trim()
        .max(
          120
        )
        .required(),

    invoiceDate:
      Joi
        .date()
        .iso()
        .required(),

    receivedDate:
      Joi
        .date()
        .iso()
        .required(),

    items:
      Joi
        .array()
        .items(
          itemSchema
        )
        .min(
          1
        )
        .required(),

    freightCharges:
      money
        .default(
          0
        ),

    otherCharges:
      money
        .default(
          0
        ),

    declaredInvoiceTotal:
      money
        .required(),

    remarks:
      Joi
        .string()
        .trim()
        .max(
          1500
        )
        .allow(
          ""
        )
        .default(
          ""
        )

  })
    .unknown(
      false
    );


/* ============================================================
   UPLOAD PURCHASE INVOICE ATTACHMENT

   Actual file validation such as:
   - maximum 1 MB
   - PDF / JPG / JPEG / PNG only

   must be enforced by the upload middleware because the binary
   file is received through req.file, not through Joi body data.
============================================================ */

export const uploadPurchaseInvoiceAttachmentSchema =
  Joi.object({

    documentType:
      Joi
        .string()
        .valid(
          ...PURCHASE_INVOICE_DOCUMENT_TYPES
        )
        .default(
          "vendor_invoice"
        ),

    otherDocumentType:
      Joi
        .when(
          "documentType",
          {
            is:
              "other",

            then:
              Joi
                .string()
                .trim()
                .min(
                  1
                )
                .max(
                  120
                )
                .required()
                .messages({
                  "any.required":
                    "Other document type details are required.",
                  "string.empty":
                    "Other document type details are required.",
                }),

            otherwise:
              Joi
                .string()
                .trim()
                .allow(
                  ""
                )
                .default(
                  ""
                )
                .strip()
          }
        )

  })
    .unknown(
      false
    );


/* ============================================================
   ATTACHMENT ID PARAM
============================================================ */

export const purchaseInvoiceAttachmentIdSchema =
  Joi.object({

    id:
      objectId
        .required(),

    attachmentId:
      objectId
        .required()

  })
    .unknown(
      false
    );


/* ============================================================
   ID PARAM
============================================================ */

export const purchaseInvoiceIdSchema =
  Joi.object({

    id:
      objectId
        .required()

  })
    .unknown(
      false
    );


/* ============================================================
   LIST QUERY
============================================================ */

export const purchaseInvoiceQuerySchema =
  Joi.object({

    search:
      Joi
        .string()
        .trim()
        .allow(
          ""
        )
        .default(
          ""
        ),

    status:
      Joi
        .string()
        .valid(
          "received",
          "matched",
          "exception",
          "verified"
        )
        .allow(
          ""
        )
        .default(
          ""
        ),

    matchStatus:
      Joi
        .string()
        .valid(
          "matched",
          "exception"
        )
        .allow(
          ""
        )
        .default(
          ""
        ),

    handoffStatus:
      Joi
        .string()
        .valid(
          "not_handed_off",
          "handing_off",
          "handed_off",
          "failed"
        )
        .allow(
          ""
        )
        .default(
          ""
        ),

    vendorId:
      objectId
        .allow(
          null,
          ""
        )
        .default(
          null
        ),

    purchaseOrderId:
      objectId
        .allow(
          null,
          ""
        )
        .default(
          null
        ),

    from:
      Joi
        .date()
        .iso()
        .allow(
          null,
          ""
        )
        .default(
          null
        ),

    to:
      Joi
        .date()
        .iso()
        .allow(
          null,
          ""
        )
        .default(
          null
        ),

    page:
      Joi
        .number()
        .integer()
        .min(
          1
        )
        .default(
          1
        ),

    limit:
      Joi
        .number()
        .integer()
        .min(
          1
        )
        .max(
          200
        )
        .default(
          25
        )

  })
    .unknown(
      false
    );