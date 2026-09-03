import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
  journalEntryIdParamSchema,
  journalEntryQuerySchema,
  voidJournalEntrySchema,
  postJournalEntrySchema,
} from "../validators/journalEntry.validator.js";

import journalEntryService
  from "../services/journalEntry.service.js";

import { ApiResponse }
  from "../utils/apiResponse.js";

import { ApiError }
  from "../utils/apiError.js";

import { asyncHandler }
  from "../utils/asyncHandler.js";


/* ============================================================
   ACCOUNTING COMPANY CONTEXT
============================================================ */

const companyIdForRequest = (req) => {
  const companyId =
    req.accountingAccess?.companyId;

  if (!companyId) {
    throw new ApiError(
      403,
      "Accounting company context missing."
    );
  }

  return companyId;
};


/* ============================================================
   CURRENT USER
============================================================ */

const userIdForRequest = (req) =>
  req.user?._id ||
  req.auth?.userId ||
  null;


/* ============================================================
   JOI VALIDATION
============================================================ */

const validate = (
  schema,
  source
) => {
  const {
    value,
    error,
  } = schema.validate(
    source,
    {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    }
  );

  if (error) {
    throw new ApiError(
      400,
      error.details?.[0]?.message ||
        "Invalid request.",
      error.details
    );
  }

  return value;
};


/* ============================================================
   CREATE JOURNAL ENTRY

   POST /accounting/journal-entries
============================================================ */

export const createJournalEntry =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const payload =
        validate(
          createJournalEntrySchema,
          req.body
        );

      const journal =
        await journalEntryService
          .createJournal({
            companyId:
              companyIdForRequest(req),

            userId:
              userIdForRequest(req),

            payload,
          });

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            journal,
            "Journal Entry created successfully."
          )
        );
    }
  );


/* ============================================================
   LIST JOURNAL ENTRIES

   GET /accounting/journal-entries
============================================================ */

export const getJournalEntries =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const query =
        validate(
          journalEntryQuerySchema,
          req.query
        );

      const journals =
        await journalEntryService
          .listJournals({
            companyId:
              companyIdForRequest(req),

            query,
          });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            journals,
            "Journal Entries fetched successfully."
          )
        );
    }
  );


/* ============================================================
   GET JOURNAL ENTRY

   GET /accounting/journal-entries/:id
============================================================ */

export const getJournalEntryById =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const params =
        validate(
          journalEntryIdParamSchema,
          req.params
        );

      const journal =
        await journalEntryService
          .getJournal({
            companyId:
              companyIdForRequest(req),

            journalEntryId:
              params.id,
          });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            journal,
            "Journal Entry fetched successfully."
          )
        );
    }
  );


/* ============================================================
   UPDATE DRAFT JOURNAL

   PATCH /accounting/journal-entries/:id
============================================================ */

export const updateJournalEntry =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const params =
        validate(
          journalEntryIdParamSchema,
          req.params
        );

      const payload =
        validate(
          updateJournalEntrySchema,
          req.body
        );

      const journal =
        await journalEntryService
          .updateJournal({
            companyId:
              companyIdForRequest(req),

            journalEntryId:
              params.id,

            userId:
              userIdForRequest(req),

            payload,
          });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            journal,
            "Journal Entry updated successfully."
          )
        );
    }
  );


/* ============================================================
   POST JOURNAL

   POST /accounting/journal-entries/:id/post

   Workflow:
     draft -> posted
============================================================ */

export const postJournalEntry =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const params =
        validate(
          journalEntryIdParamSchema,
          req.params
        );

      validate(
        postJournalEntrySchema,
        req.body || {}
      );

      const journal =
        await journalEntryService
          .postJournal({
            companyId:
              companyIdForRequest(req),

            journalEntryId:
              params.id,

            userId:
              userIdForRequest(req),
          });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            journal,
            "Journal Entry posted successfully."
          )
        );
    }
  );


/* ============================================================
   VOID JOURNAL

   POST /accounting/journal-entries/:id/void

   Workflow:
     posted -> void
============================================================ */

export const voidJournalEntry =
  asyncHandler(
    async (
      req,
      res
    ) => {
      const params =
        validate(
          journalEntryIdParamSchema,
          req.params
        );

      const payload =
        validate(
          voidJournalEntrySchema,
          req.body
        );

      const journal =
        await journalEntryService
          .voidJournal({
            companyId:
              companyIdForRequest(req),

            journalEntryId:
              params.id,

            userId:
              userIdForRequest(req),

            reason:
              payload.reason,
          });

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            journal,
            "Journal Entry voided successfully."
          )
        );
    }
  );