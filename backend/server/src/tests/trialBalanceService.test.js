import assert from "node:assert/strict";

import {
  test,
} from "node:test";


test(
  "TrialBalanceService module exists",
  async () => {

    await assert.doesNotReject(
      async () => {

        const module =
          await import(
            "../services/trialBalance.service.js"
          );

        assert.ok(
          module.TrialBalanceService,
          "TrialBalanceService export is required."
        );

      }
    );

  }
);

test(
  "TrialBalanceService defaults to the current Indian financial year",
  async () => {

    const {
      TrialBalanceService,
    } = await import(
      "../services/trialBalance.service.js"
    );

    const service =
      new TrialBalanceService();

    const result =
      await service.getTrialBalance({
        companyId: "company-1",
        now: new Date(
          "2026-09-07T00:00:00.000Z"
        ),
      });

    assert.equal(
      result.period.from,
      "2026-04-01"
    );

    assert.equal(
      result.period.to,
      "2027-03-31"
    );

  }
);

test(
  "TrialBalanceService uses explicit from and to dates when provided",
  async () => {

    const {
      TrialBalanceService,
    } = await import(
      "../services/trialBalance.service.js"
    );

    const service =
      new TrialBalanceService();

    const result =
      await service.getTrialBalance({
        companyId: "company-1",
        from: "2026-05-01",
        to: "2026-05-31",
      });

    assert.equal(
      result.period.from,
      "2026-05-01"
    );

    assert.equal(
      result.period.to,
      "2026-05-31"
    );

  }
);


test(
  "TrialBalanceService rejects when from date is after to date",
  async () => {

    const {
      TrialBalanceService,
    } = await import(
      "../services/trialBalance.service.js"
    );

    const service =
      new TrialBalanceService();

    await assert.rejects(
      () =>
        service.getTrialBalance({
          companyId: "company-1",
          from: "2026-06-30",
          to: "2026-06-01",
        }),
      /from date cannot be after to date/i
    );

  }
);

test(
  "TrialBalanceService calculates opening period movement and closing balance",
  async () => {

    const {
      TrialBalanceService,
    } = await import(
      "../services/trialBalance.service.js"
    );


    const chartOfAccountRepository = {

      async list() {

        return [
          {
            _id: "account-001",
            accountCode: "1001",
            accountName: "Cash Account",
            accountType: "cash",
            nature: "asset",
            openingBalance: 1000,
            openingBalanceType: "debit",
            status: "active",
          },
        ];

      },

    };


    const journalEntryRepository = {

      async findPostedLinesByAccount() {

        return [
          {
            journalDate:
              "2026-03-15T00:00:00.000Z",
            debit: 200,
            credit: 0,
          },
          {
            journalDate:
              "2026-04-10T00:00:00.000Z",
            debit: 300,
            credit: 0,
          },
          {
            journalDate:
              "2026-04-20T00:00:00.000Z",
            debit: 0,
            credit: 150,
          },
        ];

      },

    };


    const service =
      new TrialBalanceService({
        chartOfAccountRepository,
        journalEntryRepository,
      });


    const result =
      await service.getTrialBalance({
        companyId: "company-001",
        from: "2026-04-01",
        to: "2026-04-30",
      });


    assert.equal(
      result.accounts.length,
      1
    );


    const account =
      result.accounts[0];


    assert.equal(
      account.accountCode,
      "1001"
    );

    assert.deepEqual(
      account.openingBalance,
      {
        debit: 1200,
        credit: 0,
      }
    );

    assert.equal(
      account.periodDebit,
      300
    );

    assert.equal(
      account.periodCredit,
      150
    );

    assert.deepEqual(
      account.closingBalance,
      {
        debit: 1350,
        credit: 0,
      }
    );

  }
);

test(
  "TrialBalanceService handles credit balances and calculates balanced totals",
  async () => {

    const {
      TrialBalanceService,
    } = await import(
      "../services/trialBalance.service.js"
    );


    const chartOfAccountRepository = {

      async list() {

        return [
          {
            _id: "cash-001",
            accountCode: "1001",
            accountName: "Cash Account",
            accountType: "cash",
            nature: "asset",
            openingBalance: 1000,
            openingBalanceType: "debit",
            status: "active",
          },
          {
            _id: "capital-001",
            accountCode: "3001",
            accountName: "Capital Account",
            accountType: "capital",
            nature: "equity",
            openingBalance: 1000,
            openingBalanceType: "credit",
            status: "active",
          },
        ];

      },

    };


    const journalEntryRepository = {

      async findPostedLinesByAccount({
        accountId,
      }) {

        if (accountId === "cash-001") {

          return [
            {
              journalDate:
                "2026-04-10T00:00:00.000Z",
              debit: 300,
              credit: 0,
            },
          ];

        }


        if (accountId === "capital-001") {

          return [
            {
              journalDate:
                "2026-04-10T00:00:00.000Z",
              debit: 0,
              credit: 300,
            },
          ];

        }


        return [];

      },

    };


    const service =
      new TrialBalanceService({
        chartOfAccountRepository,
        journalEntryRepository,
      });


    const result =
      await service.getTrialBalance({
        companyId: "company-001",
        from: "2026-04-01",
        to: "2026-04-30",
      });


    assert.equal(
      result.accounts.length,
      2
    );


    const capital =
      result.accounts.find(
        (account) =>
          account.accountCode ===
          "3001"
      );


    assert.deepEqual(
      capital.openingBalance,
      {
        debit: 0,
        credit: 1000,
      }
    );

    assert.equal(
      capital.periodDebit,
      0
    );

    assert.equal(
      capital.periodCredit,
      300
    );

    assert.deepEqual(
      capital.closingBalance,
      {
        debit: 0,
        credit: 1300,
      }
    );


    assert.deepEqual(
      result.totals,
      {
        totalOpeningDebit: 1000,
        totalOpeningCredit: 1000,
        totalPeriodDebit: 300,
        totalPeriodCredit: 300,
        totalClosingDebit: 1300,
        totalClosingCredit: 1300,
        difference: 0,
        isBalanced: true,
      }
    );

  }
);
