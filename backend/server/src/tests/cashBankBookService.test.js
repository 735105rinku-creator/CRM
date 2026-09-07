import test from "node:test";
import assert from "node:assert/strict";


test(
  "CashBankBookService module exists",
  async () => {

    const module =
      await import(
        "../services/cashBankBook.service.js"
      );

    assert.equal(
      typeof module.CashBankBookService,
      "function"
    );

  }
);


test(
  "returns only Cash and Bank accounts with ledger balances and entries",
  async () => {

    const ledgerCalls = [];

    const chartOfAccountRepository = {

      async list({
        companyId
      }) {

        assert.equal(
          companyId,
          "company-1"
        );

        return [
          {
            _id: "cash-1",
            accountCode: "1001",
            accountName: "Cash Account",
            accountType: "cash",
            nature: "asset",
            status: "active",
          },
          {
            _id: "bank-1",
            accountCode: "1002",
            accountName: "HDFC Bank",
            accountType: "bank",
            nature: "asset",
            status: "active",
          },
          {
            _id: "sales-1",
            accountCode: "4001",
            accountName: "Sales",
            accountType: "sales",
            nature: "income",
            status: "active",
          },
        ];

      },

    };


    const generalLedgerService = {

      async getAccountLedger(input) {

        ledgerCalls.push(input);

        if (
          input.accountId ===
          "cash-1"
        ) {

          return {
            openingBalance: {
              amount: 1000,
              type: "debit",
            },
            entries: [
              {
                journalDate:
                  "2026-04-10",
                journalNumber:
                  "JE-001",
                narration:
                  "Cash receipt",
                debit: 500,
                credit: 0,
                runningBalance:
                  1500,
                balanceType:
                  "debit",
              },
            ],
            totals: {
              debit: 500,
              credit: 0,
            },
            closingBalance: {
              amount: 1500,
              type: "debit",
            },
          };

        }


        return {
          openingBalance: {
            amount: 2000,
            type: "debit",
          },
          entries: [
            {
              journalDate:
                "2026-04-11",
              journalNumber:
                "JE-002",
              narration:
                "Bank payment",
              debit: 0,
              credit: 250,
              runningBalance:
                1750,
              balanceType:
                "debit",
            },
          ],
          totals: {
            debit: 0,
            credit: 250,
          },
          closingBalance: {
            amount: 1750,
            type: "debit",
          },
        };

      },

    };


    const {
      CashBankBookService
    } =
      await import(
        "../services/cashBankBook.service.js"
      );


    const service =
      new CashBankBookService({
        chartOfAccountRepository,
        generalLedgerService,
      });


    const result =
      await service.getCashBankBook({
        companyId: "company-1",
        query: {
          from: "2026-04-01",
          to: "2027-03-31",
        },
      });


    assert.deepEqual(
      ledgerCalls,
      [
        {
          companyId: "company-1",
          accountId: "cash-1",
          query: {
            from: "2026-04-01",
            to: "2027-03-31",
          },
        },
        {
          companyId: "company-1",
          accountId: "bank-1",
          query: {
            from: "2026-04-01",
            to: "2027-03-31",
          },
        },
      ]
    );


    assert.equal(
      result.accounts.length,
      2
    );

    assert.equal(
      result.accounts[0]
        .accountType,
      "cash"
    );

    assert.equal(
      result.accounts[1]
        .accountType,
      "bank"
    );

    assert.equal(
      result.accounts[0]
        .entries.length,
      1
    );

    assert.deepEqual(
      result.accounts[0]
        .openingBalance,
      {
        amount: 1000,
        type: "debit",
      }
    );

    assert.deepEqual(
      result.accounts[1]
        .closingBalance,
      {
        amount: 1750,
        type: "debit",
      }
    );


    assert.deepEqual(
      result.summary,
      {
        totalAccounts: 2,
        totalOpening: 3000,
        totalDebit: 500,
        totalCredit: 250,
        totalClosing: 3250,
      }
    );

  }
);

test(
  "returns only the requested Cash or Bank account when accountId is provided",
  async () => {

    const chartOfAccountRepository = {

      async list() {

        return [
          {
            _id: "cash-1",
            accountCode: "1001",
            accountName: "Cash",
            accountType: "cash",
            nature: "asset",
            status: "active",
          },
          {
            _id: "bank-1",
            accountCode: "1002",
            accountName: "Bank",
            accountType: "bank",
            nature: "asset",
            status: "active",
          },
        ];

      },

    };


    const calls = [];

    const generalLedgerService = {

      async getAccountLedger(input) {

        calls.push(input);

        return {
          openingBalance: {
            amount: 500,
            type: "debit",
          },
          entries: [],
          totals: {
            debit: 0,
            credit: 0,
          },
          closingBalance: {
            amount: 500,
            type: "debit",
          },
        };

      },

    };


    const {
      CashBankBookService
    } =
      await import(
        "../services/cashBankBook.service.js"
      );


    const service =
      new CashBankBookService({
        chartOfAccountRepository,
        generalLedgerService,
      });


    const result =
      await service.getCashBankBook({
        companyId: "company-1",
        query: {
          accountId: "bank-1",
          from: "2026-04-01",
          to: "2027-03-31",
        },
      });


    assert.equal(
      result.accounts.length,
      1
    );

    assert.equal(
      result.accounts[0].accountId,
      "bank-1"
    );

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].accountId,
      "bank-1"
    );

  }
);


test(
  "rejects accountId when the selected account is not Cash or Bank",
  async () => {

    const chartOfAccountRepository = {

      async list() {

        return [
          {
            _id: "sales-1",
            accountCode: "4001",
            accountName: "Sales",
            accountType: "sales",
            nature: "income",
            status: "active",
          },
        ];

      },

    };


    const {
      CashBankBookService
    } =
      await import(
        "../services/cashBankBook.service.js"
      );


    const service =
      new CashBankBookService({
        chartOfAccountRepository,
        generalLedgerService: {
          async getAccountLedger() {
            throw new Error(
              "should not be called"
            );
          },
        },
      });


    await assert.rejects(
      () =>
        service.getCashBankBook({
          companyId: "company-1",
          query: {
            accountId: "sales-1",
          },
        }),
      /cash or bank/i
    );

  }
);

test(
  "defaults to current Indian financial year when from and to are omitted",
  async () => {

    const calls = [];

    const chartOfAccountRepository = {

      async list() {

        return [
          {
            _id: "cash-1",
            accountCode: "1001",
            accountName: "Cash",
            accountType: "cash",
            nature: "asset",
            status: "active",
          },
        ];

      },

    };


    const generalLedgerService = {

      async getAccountLedger(input) {

        calls.push(input);

        return {
          openingBalance: {
            amount: 0,
            type: "debit",
          },
          entries: [],
          totals: {
            debit: 0,
            credit: 0,
          },
          closingBalance: {
            amount: 0,
            type: "debit",
          },
        };

      },

    };


    const {
      CashBankBookService
    } =
      await import(
        "../services/cashBankBook.service.js"
      );


    const service =
      new CashBankBookService({
        chartOfAccountRepository,
        generalLedgerService,
      });


    await service.getCashBankBook({
      companyId: "company-1",
    });


    assert.equal(
      calls.length,
      1
    );

    assert.deepEqual(
      calls[0].query,
      {
        from: "2026-04-01",
        to: "2027-03-31",
      }
    );

  }
);


test(
  "preserves inactive Cash and Bank accounts in the report",
  async () => {

    const chartOfAccountRepository = {

      async list() {

        return [
          {
            _id: "cash-active",
            accountCode: "1001",
            accountName: "Cash Active",
            accountType: "cash",
            nature: "asset",
            status: "active",
          },
          {
            _id: "bank-inactive",
            accountCode: "1002",
            accountName: "Old Bank",
            accountType: "bank",
            nature: "asset",
            status: "inactive",
          },
        ];

      },

    };


    const generalLedgerService = {

      async getAccountLedger() {

        return {
          openingBalance: {
            amount: 0,
            type: "debit",
          },
          entries: [],
          totals: {
            debit: 0,
            credit: 0,
          },
          closingBalance: {
            amount: 0,
            type: "debit",
          },
        };

      },

    };


    const {
      CashBankBookService
    } =
      await import(
        "../services/cashBankBook.service.js"
      );


    const service =
      new CashBankBookService({
        chartOfAccountRepository,
        generalLedgerService,
      });


    const result =
      await service.getCashBankBook({
        companyId: "company-1",
        query: {
          from: "2026-04-01",
          to: "2027-03-31",
        },
      });


    assert.equal(
      result.accounts.length,
      2
    );

    assert.equal(
      result.accounts[1].status,
      "inactive"
    );

    assert.equal(
      result.accounts[1].accountId,
      "bank-inactive"
    );

  }
);

test(
  "rejects invalid from date format",
  async () => {

    const {
      CashBankBookService
    } =
      await import(
        "../services/cashBankBook.service.js"
      );


    const service =
      new CashBankBookService({
        chartOfAccountRepository: {
          async list() {
            return [];
          },
        },
        generalLedgerService: {
          async getAccountLedger() {
            throw new Error(
              "should not be called"
            );
          },
        },
      });


    await assert.rejects(
      () =>
        service.getCashBankBook({
          companyId: "company-1",
          query: {
            from: "01-04-2026",
            to: "2027-03-31",
          },
        }),
      /YYYY-MM-DD/i
    );

  }
);


test(
  "rejects when from date is after to date",
  async () => {

    const {
      CashBankBookService
    } =
      await import(
        "../services/cashBankBook.service.js"
      );


    const service =
      new CashBankBookService({
        chartOfAccountRepository: {
          async list() {
            return [];
          },
        },
        generalLedgerService: {
          async getAccountLedger() {
            throw new Error(
              "should not be called"
            );
          },
        },
      });


    await assert.rejects(
      () =>
        service.getCashBankBook({
          companyId: "company-1",
          query: {
            from: "2027-04-01",
            to: "2027-03-31",
          },
        }),
      /from.*to|date range/i
    );

  }
);

test(
  "uses signed opening and closing totals for credit Cash or Bank balances",
  async () => {

    const chartOfAccountRepository = {

      async list() {

        return [
          {
            _id: "bank-od",
            accountCode: "1005",
            accountName: "Bank Overdraft",
            accountType: "bank",
            nature: "asset",
            status: "active",
          },
        ];

      },

    };


    const generalLedgerService = {

      async getAccountLedger() {

        return {
          openingBalance: {
            amount: 1000,
            type: "credit",
          },
          entries: [],
          totals: {
            debit: 200,
            credit: 500,
          },
          closingBalance: {
            amount: 1300,
            type: "credit",
          },
        };

      },

    };


    const {
      CashBankBookService
    } =
      await import(
        "../services/cashBankBook.service.js"
      );


    const service =
      new CashBankBookService({
        chartOfAccountRepository,
        generalLedgerService,
      });


    const result =
      await service.getCashBankBook({
        companyId: "company-1",
        query: {
          from: "2026-04-01",
          to: "2027-03-31",
        },
      });


    assert.equal(
      result.summary.totalOpening,
      -1000
    );

    assert.equal(
      result.summary.totalDebit,
      200
    );

    assert.equal(
      result.summary.totalCredit,
      500
    );

    assert.equal(
      result.summary.totalClosing,
      -1300
    );

  }
);
