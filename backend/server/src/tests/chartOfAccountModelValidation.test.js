import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import ChartOfAccount from "../models/ChartOfAccount.js";

test("ChartOfAccount validation works without callback-style next middleware", async () => {
  const account = new ChartOfAccount({
    companyId: new mongoose.Types.ObjectId(),
    accountCode: "TEST-TDD-001",
    accountName: "TDD Customer Ledger",
    nature: "asset",
    accountType: "accounts_receivable",
    openingBalance: 0,
    openingBalanceType: "debit",
    status: "active"
  });

  await assert.doesNotReject(async () => {
    await account.validate();
  });
});

test("ChartOfAccount rejects an account configured as its own parent", async () => {
  const accountId = new mongoose.Types.ObjectId();

  const account = new ChartOfAccount({
    _id: accountId,
    companyId: new mongoose.Types.ObjectId(),
    accountCode: "TEST-TDD-SELF-001",
    accountName: "Self Parent Test Ledger",
    nature: "asset",
    accountType: "accounts_receivable",
    parentAccountId: accountId,
    openingBalance: 0,
    openingBalanceType: "debit",
    status: "active"
  });

  await assert.rejects(
    async () => {
      await account.validate();
    },
    /An account cannot be its own parent\./
  );
});
