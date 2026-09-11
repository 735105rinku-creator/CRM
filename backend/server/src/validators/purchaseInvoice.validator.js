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