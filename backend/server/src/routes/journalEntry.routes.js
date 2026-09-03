import express from "express";

import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntryById,
  updateJournalEntry,
  postJournalEntry,
  voidJournalEntry,
} from "../controllers/journalEntry.controller.js";


/* ============================================================
   ROUTER
============================================================ */

const router =
  express.Router();


/* ============================================================
   JOURNAL ENTRY COLLECTION
============================================================ */

/*
 * GET
 * /accounting/journal-entries
 *
 * List Journal Entries.
 */

router.get(
  "/",
  getJournalEntries
);


/*
 * POST
 * /accounting/journal-entries
 *
 * Create a new DRAFT Journal Entry.
 */

router.post(
  "/",
  createJournalEntry
);


/* ============================================================
   JOURNAL ENTRY WORKFLOW
============================================================ */

/*
 * POST
 * /accounting/journal-entries/:id/post
 *
 * Workflow:
 * draft -> posted
 */

router.post(
  "/:id/post",
  postJournalEntry
);


/*
 * POST
 * /accounting/journal-entries/:id/void
 *
 * Workflow:
 * posted -> void
 */

router.post(
  "/:id/void",
  voidJournalEntry
);


/* ============================================================
   JOURNAL ENTRY RESOURCE
============================================================ */

/*
 * GET
 * /accounting/journal-entries/:id
 *
 * Fetch one Journal Entry.
 */

router.get(
  "/:id",
  getJournalEntryById
);


/*
 * PATCH
 * /accounting/journal-entries/:id
 *
 * Only DRAFT Journal Entries are editable.
 */

router.patch(
  "/:id",
  updateJournalEntry
);


/* ============================================================
   IMPORTANT

   Physical DELETE route intentionally does not exist.

   Accounting history is retained.
   Posted entries use the VOID workflow instead.
============================================================ */


export default router;