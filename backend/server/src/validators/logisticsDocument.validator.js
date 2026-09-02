import Joi from "joi";


/* ============================================================
   COMMON
============================================================ */

const objectId =
  Joi.string()
    .hex()
    .length(24);


const optionalText =
  Joi.string()
    .trim()
    .allow(
      "",
      null
    );


const documentTypes = [
  "commercial-invoice",
  "packing-list",
  "awb",
  "bill-of-lading",
  "shipping-bill",
  "bill-of-entry",
  "certificate-origin",
  "insurance",
  "fumigation",
  "phytosanitary",
  "lr",
  "warehouse-receipt",
  "vendor-invoice",
  "customer-invoice",
  "other",
];


const documentStatuses = [
  "valid",
  "pending",
  "expired",
  "rejected",
  "other",
];


/* ============================================================
   CREATE
============================================================ */

export const createLogisticsDocumentSchema =
  Joi.object({

    shipmentNo:
      Joi.string()
        .trim()
        .uppercase()
        .max(60)
        .required(),


    customer:
      Joi.string()
        .trim()
        .min(2)
        .max(250)
        .required(),


    documentType:
      Joi.string()
        .valid(
          ...documentTypes
        )
        .required(),


    documentTypeOther:
      optionalText,


    documentTitle:
      optionalText
        .max(250),


    issueDate:
      Joi.date()
        .allow(
          "",
          null
        ),


    expiryDate:
      Joi.date()
        .allow(
          "",
          null
        ),


    issuingAuthority:
      optionalText
        .max(250),


    referenceNumber:
      optionalText
        .max(150),


    status:
      Joi.string()
        .valid(
          ...documentStatuses
        )
        .default(
          "pending"
        ),


    statusOther:
      optionalText,


    remarks:
      Joi.string()
        .trim()
        .min(2)
        .max(3000)
        .required(),

  })

    .custom(
      (
        value,
        helpers
      ) => {

        if (
          value.documentType ===
            "other" &&
          !String(
            value.documentTypeOther ||
            ""
          ).trim()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "documentTypeOther is required when documentType is other",
            }
          );
        }


        if (
          value.status ===
            "other" &&
          !String(
            value.statusOther ||
            ""
          ).trim()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "statusOther is required when status is other",
            }
          );
        }


        return value;
      }
    )

    .messages({
      "any.custom":
        "{{#message}}",
    });


/* ============================================================
   UPDATE METADATA
============================================================ */

export const updateLogisticsDocumentSchema =
  Joi.object({

    documentTitle:
      optionalText
        .max(250),


    issueDate:
      Joi.date()
        .allow(
          "",
          null
        ),


    expiryDate:
      Joi.date()
        .allow(
          "",
          null
        ),


    issuingAuthority:
      optionalText
        .max(250),


    referenceNumber:
      optionalText
        .max(150),


    status:
      Joi.string()
        .valid(
          ...documentStatuses
        )
        .optional(),


    statusOther:
      optionalText,


    remarks:
      Joi.string()
        .trim()
        .min(2)
        .max(3000)
        .optional(),

  })

    .min(1)

    .custom(
      (
        value,
        helpers
      ) => {

        if (
          value.status ===
            "other" &&
          !String(
            value.statusOther ||
            ""
          ).trim()
        ) {

          return helpers.error(
            "any.custom",
            {
              message:
                "statusOther is required when status is other",
            }
          );
        }


        return value;
      }
    )

    .messages({
      "any.custom":
        "{{#message}}",
    });


/* ============================================================
   QUERY
============================================================ */

export const logisticsDocumentQuerySchema =
  Joi.object({

    page:
      Joi.number()
        .integer()
        .min(1)
        .default(1),


    limit:
      Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20),


    search:
      optionalText,


    shipmentId:
      objectId
        .allow(
          "",
          null
        ),


    shipmentNo:
      optionalText,


    documentType:
      Joi.string()
        .valid(
          ...documentTypes
        )
        .allow(
          "",
          null
        ),


    status:
      Joi.string()
        .valid(
          ...documentStatuses
        )
        .allow(
          "",
          null
        ),


    fromDate:
      Joi.date()
        .allow(
          "",
          null
        ),


    toDate:
      Joi.date()
        .allow(
          "",
          null
        ),


    sortBy:
      Joi.string()
        .valid(
          "createdAt",
          "updatedAt",
          "documentNumber",
          "expiryDate",
          "status"
        )
        .default(
          "createdAt"
        ),


    sortOrder:
      Joi.string()
        .valid(
          "asc",
          "desc"
        )
        .default(
          "desc"
        ),

  });