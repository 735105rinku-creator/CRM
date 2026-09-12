import { ROLES } from "../constants/roles.js";

import fs from "fs";
import path from "path";

import service from "../services/logisticsInvoice.service.js";

import {
  createLogisticsInvoiceSchema,
  updateLogisticsInvoiceSchema,
  logisticsInvoiceQuerySchema,
} from "../validators/logisticsInvoice.validator.js";

import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


/* ============================================================
   COMPANY CONTEXT
============================================================ */

const companyIdForRequest = req => {

  const auth =
    req.auth?.companyId ||
    req.user?.companyId?._id ||
    req.user?.companyId;


  if (
    req.user?.role !==
    ROLES.SUPER_ADMIN
  ) {

    if (
      !auth
    ) {

      throw new ApiError(
        403,
        "Company context missing"
      );
    }


    return auth;
  }


  const id =
    req.query?.companyId ||
    req.body?.companyId ||
    auth;


  if (
    !id
  ) {

    throw new ApiError(
      400,
      "companyId is required for Super Admin"
    );
  }


  return id;
};


/* ============================================================
   CURRENT USER ID
============================================================ */

const userIdForRequest = req =>
  req.user?._id ||
  req.user?.id ||
  null;


/* ============================================================
   CURRENT EMPLOYEE ID
============================================================ */

const employeeIdForRequest = req =>
  req.logisticsAccess?.employeeId ||
  null;


/* ============================================================
   LOGISTICS ACCESS TYPE
============================================================ */

const accessTypeForRequest = req =>
  String(
    req.logisticsAccess?.accessType ||
    ""
  )
    .trim()
    .toLowerCase();


/* ============================================================
   ACCOUNTS HANDOFF ACCESS
============================================================ */

const canHandoffForRequest = req =>
  Boolean(
    req.logisticsAccess
      ?.canHandoffToAccounts
  );


/* ============================================================
   CURRENT USER / EMPLOYEE DISPLAY NAME
============================================================ */

const userNameForRequest = req => {

  const firstName =
    String(
      req.user?.firstName ||
      ""
    ).trim();


  const lastName =
    String(
      req.user?.lastName ||
      ""
    ).trim();


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
    req.user?.email ||
    req.logisticsAccess?.employeeCode ||
    ""
  ).trim();
};


/* ============================================================
   COMMON READ ACCESS CONTEXT

   Junior:
     accessType = employee
     canHandoffToAccounts = false
     => own records only

   Senior:
     accessType = employee
     canHandoffToAccounts = true
     => department review visibility

   Management:
     accessType = management
     => existing monitoring visibility
============================================================ */

const readAccessForRequest = req => ({
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
   VALIDATION
============================================================ */

const validate = (
  schema,
  data
) => {

  const {
    value,
    error,
  } =
    schema.validate(
      data,
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
      error.details[0].message,
      error.details
    );
  }


  return value;
};


/* ============================================================
   CREATE LOGISTICS INVOICE
============================================================ */

export const createLogisticsInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await service.create({

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

          payload:
            validate(
              createLogisticsInvoiceSchema,
              req.body
            ),
        });


      res
        .status(
          201
        )
        .json(
          new ApiResponse(
            201,
            data,
            "Logistics invoice created successfully"
          )
        );
    }
  );


/* ============================================================
   LIST LOGISTICS INVOICES

   Backend workspace visibility:

   Junior:
     own invoices only

   Senior:
     all Logistics department invoices for review

   Management:
     existing monitoring visibility
============================================================ */

export const getLogisticsInvoices =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await service.list({

          companyId:
            companyIdForRequest(
              req
            ),

          query:
            validate(
              logisticsInvoiceQuerySchema,
              req.query
            ),

          ...readAccessForRequest(
            req
          ),
        });


      res.json(
        new ApiResponse(
          200,
          data,
          "Logistics invoices fetched successfully"
        )
      );
    }
  );


/* ============================================================
   LOGISTICS INVOICE SUMMARY

   Same workspace scope as list.

   Junior:
     own totals

   Senior:
     department totals

   Management:
     monitoring totals
============================================================ */

export const getLogisticsInvoiceSummary =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await service.summary({

          companyId:
            companyIdForRequest(
              req
            ),

          ...readAccessForRequest(
            req
          ),
        });


      res.json(
        new ApiResponse(
          200,
          data,
          "Invoice summary fetched successfully"
        )
      );
    }
  );


/* ============================================================
   GET LOGISTICS INVOICE

   Junior cannot manually access another employee's invoice ID.

   Senior can review junior invoice.

   Management monitoring remains preserved.
============================================================ */

export const getLogisticsInvoiceById =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await service.get({

          companyId:
            companyIdForRequest(
              req
            ),

          invoiceId:
            req.params.id,

          ...readAccessForRequest(
            req
          ),
        });


      res.json(
        new ApiResponse(
          200,
          data,
          "Logistics invoice fetched successfully"
        )
      );
    }
  );


/* ============================================================
   UPDATE LOGISTICS INVOICE

   Creator-only mutation.

   Senior may review junior invoice but cannot edit it.
============================================================ */

export const updateLogisticsInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await service.update({

          companyId:
            companyIdForRequest(
              req
            ),

          invoiceId:
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

          payload:
            validate(
              updateLogisticsInvoiceSchema,
              req.body
            ),
        });


      res.json(
        new ApiResponse(
          200,
          data,
          "Logistics invoice updated successfully"
        )
      );
    }
  );


/* ============================================================
   UPLOAD / REPLACE LOGISTICS INVOICE COPY

   Creator only.

   Senior may review/download junior invoice copy but cannot
   replace it.

   Physical file remains on filesystem.
   MongoDB stores metadata/reference only.
============================================================ */

export const uploadLogisticsInvoiceCopy =
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
          "Invoice copy file is required"
        );
      }


      try {

        const data =
          await service
            .attachInvoiceCopy({

              companyId:
                companyIdForRequest(
                  req
                ),

              invoiceId:
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
              data,
              "Invoice copy uploaded successfully"
            )
          );

      } catch (
        error
      ) {

        /*
         * Multer writes the physical file before business
         * validation.
         *
         * If ownership or state validation rejects the request,
         * remove the newly-created orphan file.
         */

        if (
          req.file?.path &&
          fs.existsSync(
            req.file.path
          )
        ) {

          fs.unlinkSync(
            req.file.path
          );
        }


        throw error;
      }
    }
  );


/* ============================================================
   PREVIEW LOGISTICS INVOICE COPY

   Uses requester-aware read visibility.

   Junior:
     own invoice copy only

   Senior:
     can review junior invoice copy

   Management:
     monitoring visibility preserved
============================================================ */

export const previewLogisticsInvoiceCopy =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const invoice =
        await service.get({

          companyId:
            companyIdForRequest(
              req
            ),

          invoiceId:
            req.params.id,

          ...readAccessForRequest(
            req
          ),
        });


      const copy =
        invoice.invoiceCopy;


      if (
        !copy?.filePath
      ) {

        throw new ApiError(
          404,
          "Invoice copy not found"
        );
      }


      const safePath =
        path.resolve(
          copy.filePath
        );


      if (
        !fs.existsSync(
          safePath
        )
      ) {

        throw new ApiError(
          404,
          "Invoice copy file not found"
        );
      }


      res.setHeader(
        "Content-Type",
        copy.mimeType ||
        "application/octet-stream"
      );


      res.setHeader(
        "Content-Disposition",
        `inline; filename="${String(
          copy.originalName ||
          copy.fileName ||
          "invoice-copy"
        ).replace(
          /[\r\n"]/g,
          "_"
        )}"`
      );


      return res.sendFile(
        safePath
      );
    }
  );


/* ============================================================
   SEND LOGISTICS CUSTOMER INVOICE TO ACCOUNTS

   Department Head -> allowed
   Team Leader     -> allowed

   Junior employee -> rejected
   Management-only context -> rejected

   IMPORTANT:

   Ownership is intentionally NOT required.

   Senior may:
   - review junior invoice
   - review invoice copy
   - send eligible junior invoice to Accounts

   Senior may NOT:
   - edit junior invoice
   - replace junior invoice copy
   - delete junior invoice
============================================================ */

export const handoffLogisticsInvoiceToAccounts =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await service
          .handoffToAccounts({

            companyId:
              companyIdForRequest(
                req
              ),

            invoiceId:
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


      res.json(
        new ApiResponse(
          200,
          data,
          "Logistics invoice sent to Accounts successfully"
        )
      );
    }
  );


/* ============================================================
   DELETE LOGISTICS INVOICE

   Creator only.

   Senior cannot delete junior invoice.

   Accounts-handoff invoice remains immutable.
============================================================ */

export const deleteLogisticsInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      await service.remove({

        companyId:
          companyIdForRequest(
            req
          ),

        invoiceId:
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
      });


      res.json(
        new ApiResponse(
          200,
          null,
          "Logistics invoice deleted successfully"
        )
      );
    }
  );