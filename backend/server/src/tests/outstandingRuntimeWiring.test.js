import test from "node:test";
import assert from "node:assert/strict";

import {
  outstandingController
} from "../controllers/outstanding.controller.js";


test(
  "Outstanding runtime wiring uses a configured General Ledger service",
  () => {

    const service =
      outstandingController
        .outstandingService;

    assert.ok(
      service,
      "Outstanding service should be configured."
    );

    assert.ok(
      service.generalLedgerService,
      "General Ledger service should be injected."
    );

    assert.ok(
      service.generalLedgerService
        .chartOfAccountRepository,
      "General Ledger service must have Chart of Account repository."
    );

    assert.equal(
      typeof service
        .generalLedgerService
        .chartOfAccountRepository
        .findById,
      "function"
    );

    assert.ok(
      service.generalLedgerService
        .journalEntryRepository,
      "General Ledger service must have Journal Entry repository."
    );

    assert.equal(
      typeof service
        .generalLedgerService
        .journalEntryRepository
        .findPostedLinesByAccount,
      "function"
    );

  }
);