import fs from "fs";
import path from "path";

import service
  from "../services/departmentInvoice.service.js";

import {
  departmentInvoiceQuerySchema,
  departmentInvoiceIdSchema,
  verifyDepartmentInvoiceSchema,
  rejectDepartmentInvoiceSchema,
  payDepartmentInvoiceSchema,
  companyAdminApprovalQuerySchema,
  companyAdminApprovalDecisionSchema,
} from "../validators/departmentInvoice.validator.js";

import { ROLES }
  from "../constants/roles.js";

import { ApiError }
  from "../utils/apiError.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";

import { emitDepartmentInvoiceUpdated }
  from "../utils/departmentInvoiceRealtime.js";


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

        convert:
          true,
      }
    );


  if (
    error
  ) {

    throw new ApiError(
      400,
      error.details
        .map(
          item =>
            item.message
        )
        .join(
          ", "
        )
    );
  }


  return value;
};


/* ============================================================
   COMPANY CONTEXT
============================================================ */

const company = req =>
  req.accountingAccess
    ?.companyId;


/* ============================================================
   SAFE FILE NAME
============================================================ */

const safeFileName = (
  value
) =>
  String(
    value ||
    "invoice-document"
  )
    .replace(
      /[\r\n"]/g,
      "_"
    )
    .trim() ||
  "invoice-document";


/* ============================================================
   ALLOWED DOCUMENT ROOTS

   Existing project storage:

   /uploads/*
     -> <backend cwd>/public/uploads/*

   /uploads/logistics-documents/*
     -> <backend cwd>/uploads/logistics-documents/*
============================================================ */

const PUBLIC_UPLOAD_ROOT =
  path.resolve(
    process.cwd(),
    "public",
    "uploads"
  );


const LOGISTICS_DOCUMENT_ROOT =
  path.resolve(
    process.cwd(),
    "uploads",
    "logistics-documents"
  );


/* ============================================================
   CHECK PATH IS INSIDE ALLOWED ROOT
============================================================ */

const isInsideRoot = (
  root,
  candidate
) => {

  const relative =
    path.relative(
      root,
      candidate
    );


  return Boolean(
    relative ===
      "" ||
    (
      !relative.startsWith(
        ".."
      ) &&
      !path.isAbsolute(
        relative
      )
    )
  );
};


/* ============================================================
   NORMALIZE FILE URL PATH

   Supports:
   - /uploads/...
   - absolute http(s) URL containing /uploads/...
============================================================ */

const fileUrlPath = (
  value
) => {

  const input =
    String(
      value ||
      ""
    )
      .trim();


  if (
    !input
  ) {

    return "";
  }


  try {

    if (
      /^https?:\/\//i.test(
        input
      )
    ) {

      return new URL(
        input
      ).pathname;
    }


    return input
      .split(
        "?"
      )[0]
      .split(
        "#"
      )[0];

  } catch {

    return "";
  }
};


/* ============================================================
   BUILD FILE CANDIDATES

   We support both:

   1. filePath
      Existing Logistics metadata may contain filesystem path.

   2. fileUrl
      Purchase and some Logistics metadata primarily use
      /uploads/... URLs.

   No arbitrary external location is served.
============================================================ */

const documentCandidates = (
  document
) => {

  const candidates =
    [];


  const storedPath =
    String(
      document?.filePath ||
      ""
    )
      .trim();


  if (
    storedPath
  ) {

    candidates.push(
      path.resolve(
        storedPath
      )
    );


    /*
     * Some metadata may contain a cwd-relative path.
     */
    if (
      !path.isAbsolute(
        storedPath
      )
    ) {

      candidates.push(
        path.resolve(
          process.cwd(),
          storedPath
        )
      );
    }
  }


  const urlPath =
    fileUrlPath(
      document?.fileUrl
    );


  if (
    urlPath
  ) {

    let decodedPath =
      urlPath;


    try {

      decodedPath =
        decodeURIComponent(
          urlPath
        );

    } catch {

      decodedPath =
        urlPath;
    }


    const normalized =
      decodedPath
        .replace(
          /\\/g,
          "/"
        );


    const logisticsPrefix =
      "/uploads/logistics-documents/";


    const generalPrefix =
      "/uploads/";


    if (
      normalized.startsWith(
        logisticsPrefix
      )
    ) {

      const relative =
        normalized.slice(
          logisticsPrefix.length
        );


      candidates.push(
        path.resolve(
          LOGISTICS_DOCUMENT_ROOT,
          relative
        )
      );
    }


    if (
      normalized.startsWith(
        generalPrefix
      )
    ) {

      const relative =
        normalized.slice(
          generalPrefix.length
        );


      candidates.push(
        path.resolve(
          PUBLIC_UPLOAD_ROOT,
          relative
        )
      );
    }
  }


  return [
    ...new Set(
      candidates
    ),
  ];
};


/* ============================================================
   RESOLVE SAFE DOCUMENT PATH

   Important:
   - candidate must exist
   - candidate must be a file
   - candidate must remain inside one of approved upload roots
============================================================ */

const resolveDocumentPath = (
  document
) => {

  const candidates =
    documentCandidates(
      document
    );


  for (
    const candidate of
    candidates
  ) {

    const safeCandidate =
      path.resolve(
        candidate
      );


    const allowed =
      isInsideRoot(
        PUBLIC_UPLOAD_ROOT,
        safeCandidate
      ) ||
      isInsideRoot(
        LOGISTICS_DOCUMENT_ROOT,
        safeCandidate
      );


    if (
      !allowed
    ) {

      continue;
    }


    if (
      !fs.existsSync(
        safeCandidate
      )
    ) {

      continue;
    }


    let stat;


    try {

      stat =
        fs.statSync(
          safeCandidate
        );

    } catch {

      continue;
    }


    if (
      !stat.isFile()
    ) {

      continue;
    }


    return safeCandidate;
  }


  throw new ApiError(
    404,
    "Invoice document file was not found."
  );
};


/* ============================================================
   LIST DEPARTMENT INVOICES
============================================================ */

export const listDepartmentInvoices =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const data =
        await service.list(
          company(
            req
          ),

          validate(
            departmentInvoiceQuerySchema,
            req.query
          )
        );


      res.json(
        new ApiResponse(
          200,
          data,
          "Department invoices fetched."
        )
      );
    }
  );


/* ============================================================
   GET DEPARTMENT INVOICE
============================================================ */

export const getDepartmentInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id,
      } =
        validate(
          departmentInvoiceIdSchema,
          req.params
        );


      const data =
        await service.get(
          company(
            req
          ),
          id
        );


      res.json(
        new ApiResponse(
          200,
          data,
          "Department invoice fetched."
        )
      );
    }
  );

export const listCompanyAdminApprovals =
  asyncHandler(async (req, res) => {
    if (![ROLES.COMPANY_ADMIN, ROLES.SUPER_ADMIN].includes(req.user?.role)) {
      throw new ApiError(403, "Company Admin approval access is required.");
    }

    const query = validate(companyAdminApprovalQuerySchema, req.query);
    const data = await service.list(company(req), query);
    res.json(new ApiResponse(200, data, "Invoice approvals fetched."));
  });

export const decideCompanyAdminApproval =
  asyncHandler(async (req, res) => {
    if (req.user?.role !== ROLES.COMPANY_ADMIN) {
      throw new ApiError(403, "Only Company Admin can decide invoice approval.");
    }

    const { id } = validate(departmentInvoiceIdSchema, req.params);
    const payload = validate(companyAdminApprovalDecisionSchema, req.body || {});
    const data = await service.decideCompanyAdminApproval(company(req), id, payload, req.user);
    emitDepartmentInvoiceUpdated(data, payload.decision === "approved" ? "admin_approved" : "admin_rejected");
    res.json(new ApiResponse(200, data, `Invoice ${payload.decision}.`));
  });


/* ============================================================
   DOWNLOAD / PREVIEW DEPARTMENT INVOICE DOCUMENT

   Used by Accounts workspace.

   Security flow:

   Accounts access
      ->
   company-scoped DepartmentInvoice
      ->
   valid document index
      ->
   approved upload root
      ->
   physical file

   Frontend may use the same endpoint for:
   - View
   - Download

   because it retrieves the response as an authenticated Blob.
============================================================ */

export const downloadDepartmentInvoiceDocument =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id,
      } =
        validate(
          departmentInvoiceIdSchema,
          {
            id:
              req.params.id,
          }
        );


      const document =
        await service.getDocument(
          company(
            req
          ),
          id,
          req.params.index
        );


      const safePath =
        resolveDocumentPath(
          document
        );


      const fallbackName =
        path.basename(
          safePath
        );


      const fileName =
        safeFileName(
          document.fileName ||
          fallbackName ||
          document.label
        );


      res.setHeader(
        "Content-Type",
        document.mimeType ||
        "application/octet-stream"
      );


      /*
       * Keep inline disposition so the same authenticated
       * endpoint can be used for browser preview.
       *
       * Accounts frontend controls explicit downloading after
       * receiving the Blob.
       */
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fileName}"`
      );


      res.setHeader(
        "Cache-Control",
        "private, no-store"
      );


      return res.sendFile(
        safePath
      );
    }
  );


/* ============================================================
   VERIFY DEPARTMENT INVOICE
============================================================ */

export const verifyDepartmentInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id,
      } =
        validate(
          departmentInvoiceIdSchema,
          req.params
        );


      const payload =
        validate(
          verifyDepartmentInvoiceSchema,
          req.body ||
          {}
        );


      const data =
        await service.verify(
          company(
            req
          ),
          id,
          payload,
          req.user
        );

      emitDepartmentInvoiceUpdated(data, "verified");


      res.json(
        new ApiResponse(
          200,
          data,
          "Invoice verified."
        )
      );
    }
  );


/* ============================================================
   REJECT DEPARTMENT INVOICE
============================================================ */

export const rejectDepartmentInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id,
      } =
        validate(
          departmentInvoiceIdSchema,
          req.params
        );


      const payload =
        validate(
          rejectDepartmentInvoiceSchema,
          req.body ||
          {}
        );


      const data =
        await service.reject(
          company(
            req
          ),
          id,
          payload.reason,
          req.user
        );

      emitDepartmentInvoiceUpdated(data, "accounts_rejected");


      res.json(
        new ApiResponse(
          200,
          data,
          "Invoice rejected."
        )
      );
    }
  );


/* ============================================================
   RECORD DEPARTMENT INVOICE PAYMENT
============================================================ */

export const payDepartmentInvoice =
  asyncHandler(
    async (
      req,
      res
    ) => {

      const {
        id,
      } =
        validate(
          departmentInvoiceIdSchema,
          req.params
        );


      const payload =
        validate(
          payDepartmentInvoiceSchema,
          req.body ||
          {}
        );


      const data =
        await service.pay(
          company(
            req
          ),
          id,
          payload,
          req.user
        );

      emitDepartmentInvoiceUpdated(data, data.status === "paid" ? "paid" : "partially_paid");


      res.json(
        new ApiResponse(
          200,
          data,
          "Payment recorded."
        )
      );
    }
  );
