import test from "node:test";
import assert from "node:assert/strict";

const loadService = async () =>
  import("../services/outstanding.service.js");


test(
  "OutstandingService module exists",
  async () => {

    const module =
      await loadService();

    assert.equal(
      typeof module.OutstandingService,
      "function"
    );

  }
);


test(
  "returns receivable and payable outstanding using exact account types",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();


    const accounts = [
      {
        _id: "customer-1",
        accountCode: "AR001",
        accountName: "ABC Customer",
        accountType: "accounts_receivable",
        nature: "asset",
        status: "active",
      },
      {
        _id: "supplier-1",
        accountCode: "AP001",
        accountName: "XYZ Supplier",
        accountType: "accounts_payable",
        nature: "liability",
        status: "active",
      },
      {
        _id: "cash-1",
        accountCode: "CASH01",
        accountName: "Cash",
        accountType: "cash",
        nature: "asset",
        status: "active",
      },
    ];


    const chartOfAccountRepository = {

      async list() {
        return accounts;
      },

    };


    const generalLedgerService = {

      async getAccountLedger({
        accountId,
      }) {

        if (
          accountId ===
          "customer-1"
        ) {

          return {
            closingBalance: {
              amount: 12500,
              type: "debit",
            },
          };

        }


        return {
          closingBalance: {
            amount: 7000,
            type: "credit",
          },
        };

      },

    };


    const service =
      new OutstandingService({
        chartOfAccountRepository,
        generalLedgerService,
      });


    const result =
      await service.getOutstanding({
        companyId: "company-1",
        query: {
          asOf: "2026-09-07",
        },
      });


    assert.equal(
      result.receivables.accounts.length,
      1
    );

    assert.equal(
      result.payables.accounts.length,
      1
    );

    assert.equal(
      result.receivables.accounts[0]
        .accountId,
      "customer-1"
    );

    assert.equal(
      result.payables.accounts[0]
        .accountId,
      "supplier-1"
    );

    assert.equal(
      result.receivables.total,
      12500
    );

    assert.equal(
      result.payables.total,
      7000
    );

  }
);

test(
  "filters only receivables when type is receivable",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const chartOfAccountRepository = {
      async list() {
        return [
          {
            _id: "customer-1",
            accountCode: "AR001",
            accountName: "ABC Customer",
            accountType:
              "accounts_receivable",
            nature: "asset",
            status: "active",
          },
          {
            _id: "supplier-1",
            accountCode: "AP001",
            accountName: "XYZ Supplier",
            accountType:
              "accounts_payable",
            nature: "liability",
            status: "active",
          },
        ];
      },
    };

    const generalLedgerService = {
      async getAccountLedger({
        accountId,
      }) {
        return {
          closingBalance: {
            amount:
              accountId ===
              "customer-1"
                ? 1000
                : 500,
            type:
              accountId ===
              "customer-1"
                ? "debit"
                : "credit",
          },
        };
      },
    };

    const service =
      new OutstandingService({
        chartOfAccountRepository,
        generalLedgerService,
      });

    const result =
      await service.getOutstanding({
        companyId: "company-1",
        query: {
          type: "receivable",
          asOf: "2026-09-07",
        },
      });

    assert.equal(
      result.receivables.accounts.length,
      1
    );

    assert.equal(
      result.payables.accounts.length,
      0
    );

  }
);


test(
  "filters only payables when type is payable",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const chartOfAccountRepository = {
      async list() {
        return [
          {
            _id: "customer-1",
            accountType:
              "accounts_receivable",
          },
          {
            _id: "supplier-1",
            accountType:
              "accounts_payable",
          },
        ];
      },
    };

    const generalLedgerService = {
      async getAccountLedger({
        accountId,
      }) {
        return {
          closingBalance: {
            amount:
              accountId ===
              "supplier-1"
                ? 700
                : 300,
            type:
              accountId ===
              "supplier-1"
                ? "credit"
                : "debit",
          },
        };
      },
    };

    const service =
      new OutstandingService({
        chartOfAccountRepository,
        generalLedgerService,
      });

    const result =
      await service.getOutstanding({
        companyId: "company-1",
        query: {
          type: "payable",
          asOf: "2026-09-07",
        },
      });

    assert.equal(
      result.receivables.accounts.length,
      0
    );

    assert.equal(
      result.payables.accounts.length,
      1
    );

  }
);


test(
  "returns only requested receivable or payable account when accountId is provided",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const chartOfAccountRepository = {
      async list() {
        return [
          {
            _id: "customer-1",
            accountType:
              "accounts_receivable",
          },
          {
            _id: "customer-2",
            accountType:
              "accounts_receivable",
          },
        ];
      },
    };

    const generalLedgerService = {
      async getAccountLedger() {
        return {
          closingBalance: {
            amount: 2500,
            type: "debit",
          },
        };
      },
    };

    const service =
      new OutstandingService({
        chartOfAccountRepository,
        generalLedgerService,
      });

    const result =
      await service.getOutstanding({
        companyId: "company-1",
        query: {
          accountId: "customer-2",
          asOf: "2026-09-07",
        },
      });

    assert.equal(
      result.receivables.accounts.length,
      1
    );

    assert.equal(
      result.receivables.accounts[0]
        .accountId,
      "customer-2"
    );

  }
);


test(
  "rejects accountId when selected account is not receivable or payable",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const chartOfAccountRepository = {
      async list() {
        return [
          {
            _id: "cash-1",
            accountType: "cash",
          },
        ];
      },
    };

    const generalLedgerService = {
      async getAccountLedger() {
        throw new Error(
          "should not be called"
        );
      },
    };

    const service =
      new OutstandingService({
        chartOfAccountRepository,
        generalLedgerService,
      });

    await assert.rejects(
      () =>
        service.getOutstanding({
          companyId: "company-1",
          query: {
            accountId: "cash-1",
            asOf: "2026-09-07",
          },
        }),
      /Receivable or Payable/
    );

  }
);


test(
  "rejects unsupported type",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const service =
      new OutstandingService({
        chartOfAccountRepository: {
          async list() {
            return [];
          },
        },
        generalLedgerService: {},
      });

    await assert.rejects(
      () =>
        service.getOutstanding({
          companyId: "company-1",
          query: {
            type: "other",
            asOf: "2026-09-07",
          },
        }),
      /type must be receivable or payable/
    );

  }
);


test(
  "rejects invalid asOf date",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const service =
      new OutstandingService({
        chartOfAccountRepository: {
          async list() {
            return [];
          },
        },
        generalLedgerService: {},
      });

    await assert.rejects(
      () =>
        service.getOutstanding({
          companyId: "company-1",
          query: {
            asOf: "07-09-2026",
          },
        }),
      /asOf must be a valid YYYY-MM-DD date/
    );

  }
);


test(
  "preserves inactive receivable and payable accounts",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const chartOfAccountRepository = {
      async list() {
        return [
          {
            _id: "customer-1",
            accountType:
              "accounts_receivable",
            status: "inactive",
          },
          {
            _id: "supplier-1",
            accountType:
              "accounts_payable",
            status: "inactive",
          },
        ];
      },
    };

    const generalLedgerService = {
      async getAccountLedger({
        accountId,
      }) {
        return {
          closingBalance: {
            amount: 0,
            type:
              accountId ===
              "customer-1"
                ? "debit"
                : "credit",
          },
        };
      },
    };

    const service =
      new OutstandingService({
        chartOfAccountRepository,
        generalLedgerService,
      });

    const result =
      await service.getOutstanding({
        companyId: "company-1",
        query: {
          asOf: "2026-09-07",
        },
      });

    assert.equal(
      result.receivables.accounts.length,
      1
    );

    assert.equal(
      result.payables.accounts.length,
      1
    );

  }
);

test(
  "defaults asOf to current date when omitted",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const chartOfAccountRepository = {
      async list() {
        return [
          {
            _id: "customer-1",
            accountType:
              "accounts_receivable",
          },
        ];
      },
    };

    let receivedQuery = null;

    const generalLedgerService = {
      async getAccountLedger({
        query,
      }) {
        receivedQuery = query;

        return {
          closingBalance: {
            amount: 1000,
            type: "debit",
          },
        };
      },
    };

    const service =
      new OutstandingService({
        chartOfAccountRepository,
        generalLedgerService,
      });

    const result =
      await service.getOutstanding({
        companyId: "company-1",
        query: {},
      });

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    assert.equal(
      result.asOf,
      today
    );

    assert.equal(
      receivedQuery.to,
      today
    );

  }
);


test(
  "preserves signed receivable reversal balance",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const service =
      new OutstandingService({
        chartOfAccountRepository: {
          async list() {
            return [
              {
                _id: "customer-1",
                accountType:
                  "accounts_receivable",
              },
            ];
          },
        },

        generalLedgerService: {
          async getAccountLedger() {
            return {
              closingBalance: {
                amount: 500,
                type: "credit",
              },
            };
          },
        },
      });

    const result =
      await service.getOutstanding({
        companyId: "company-1",
        query: {
          asOf: "2026-09-07",
        },
      });

    assert.equal(
      result.receivables.accounts[0]
        .outstanding,
      -500
    );

    assert.equal(
      result.receivables.total,
      -500
    );

  }
);


test(
  "preserves signed payable reversal balance",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const service =
      new OutstandingService({
        chartOfAccountRepository: {
          async list() {
            return [
              {
                _id: "supplier-1",
                accountType:
                  "accounts_payable",
              },
            ];
          },
        },

        generalLedgerService: {
          async getAccountLedger() {
            return {
              closingBalance: {
                amount: 300,
                type: "debit",
              },
            };
          },
        },
      });

    const result =
      await service.getOutstanding({
        companyId: "company-1",
        query: {
          asOf: "2026-09-07",
        },
      });

    assert.equal(
      result.payables.accounts[0]
        .outstanding,
      -300
    );

    assert.equal(
      result.payables.total,
      -300
    );

  }
);

test(
  "includes ledger opening movement closing balance and transaction rows",
  async () => {

    const {
      OutstandingService,
    } =
      await loadService();

    const chartOfAccountRepository = {
      async list() {
        return [
          {
            _id: "customer-1",
            accountCode: "AR001",
            accountName: "ABC Customer",
            accountType:
              "accounts_receivable",
            nature: "asset",
            status: "active",
          },
        ];
      },
    };


    const ledgerEntries = [
      {
        journalNumber: "JV-001",
        journalDate: "2026-09-01",
        narration: "Opening invoice",
        debit: 5000,
        credit: 0,
        runningBalance: 7000,
        balanceType: "debit",
      },

      {
        journalNumber: "RV-001",
        journalDate: "2026-09-05",
        narration: "Receipt",
        debit: 0,
        credit: 2000,
        runningBalance: 5000,
        balanceType: "debit",
      },
    ];


    const generalLedgerService = {
      async getAccountLedger() {
        return {
          openingBalance: {
            amount: 2000,
            type: "debit",
          },

          entries:
            ledgerEntries,

          totals: {
            debit: 5000,
            credit: 2000,
          },

          closingBalance: {
            amount: 5000,
            type: "debit",
          },
        };
      },
    };


    const service =
      new OutstandingService({
        chartOfAccountRepository,
        generalLedgerService,
      });


    const result =
      await service.getOutstanding({
        companyId: "company-1",

        query: {
          asOf: "2026-09-07",
        },
      });


    const account =
      result.receivables
        .accounts[0];


    assert.deepEqual(
      account.openingBalance,
      {
        amount: 2000,
        type: "debit",
      }
    );


    assert.equal(
      account.debitMovement,
      5000
    );


    assert.equal(
      account.creditMovement,
      2000
    );


    assert.deepEqual(
      account.closingBalance,
      {
        amount: 5000,
        type: "debit",
      }
    );


    assert.equal(
      account.balanceType,
      "debit"
    );


    assert.deepEqual(
      account.entries,
      ledgerEntries
    );

  }
);
