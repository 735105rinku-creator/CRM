import test from "node:test";
import assert from "node:assert/strict";

test(
  "AccountPartyService module exists",
  async () => {
    const module =
      await import(
        "../services/accountParty.service.js"
      );

    assert.equal(
      typeof module.AccountPartyService,
      "function"
    );
  }
);

test(
  "lists customer parties using exact accounts_receivable account type",
  async () => {
    const calls = [];

    const chartOfAccountRepository = {
      async list(query) {
        calls.push(query);

        return [
          {
            _id: "customer-account-1",
            accountCode: "CUS001",
            accountName: "ABC Traders",
            nature: "asset",
            accountType:
              "accounts_receivable",
            status: "active",
          },
        ];
      },
    };

    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountRepository,
      });

    const rows =
      await service.listParties({
        companyId:
          "64b000000000000000000001",
        type:
          "customer",
      });

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].companyId,
      "64b000000000000000000001"
    );

    assert.equal(
      calls[0].accountType,
      "accounts_receivable"
    );

    assert.equal(
      rows.length,
      1
    );

    assert.equal(
      rows[0].partyType,
      "customer"
    );

    assert.equal(
      rows[0].accountType,
      "accounts_receivable"
    );
  }
);

test(
  "lists vendor parties using exact accounts_payable account type",
  async () => {
    const calls = [];

    const chartOfAccountRepository = {
      async list(query) {
        calls.push(query);

        return [
          {
            _id: "vendor-account-1",
            accountCode: "VEN001",
            accountName:
              "XYZ Supplier",
            nature:
              "liability",
            accountType:
              "accounts_payable",
            status:
              "active",
          },
        ];
      },
    };

    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountRepository,
      });

    const rows =
      await service.listParties({
        companyId:
          "64b000000000000000000001",
        type:
          "vendor",
      });

    assert.equal(
      calls[0].accountType,
      "accounts_payable"
    );

    assert.equal(
      rows[0].partyType,
      "vendor"
    );

    assert.equal(
      rows[0].accountType,
      "accounts_payable"
    );
  }
);

test(
  "preserves inactive customer and vendor ledgers",
  async () => {
    const chartOfAccountRepository = {
      async list() {
        return [
          {
            _id: "inactive-1",
            accountCode:
              "CUS002",
            accountName:
              "Old Customer",
            nature:
              "asset",
            accountType:
              "accounts_receivable",
            status:
              "inactive",
          },
        ];
      },
    };

    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountRepository,
      });

    const rows =
      await service.listParties({
        companyId:
          "64b000000000000000000001",
        type:
          "customer",
      });

    assert.equal(
      rows.length,
      1
    );

    assert.equal(
      rows[0].status,
      "inactive"
    );
  }
);

test(
  "rejects unsupported party type",
  async () => {
    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountRepository: {},
      });

    await assert.rejects(
      () =>
        service.listParties({
          companyId:
            "64b000000000000000000001",
          type:
            "supplier",
        }),
      /customer|vendor/i
    );
  }
);

test(
  "creates customer as an accounts_receivable asset ledger",
  async () => {
    const calls = [];

    const chartOfAccountService = {
      async createAccount(input) {
        calls.push(input);

        return {
          _id: "customer-1",
          ...input.payload,
        };
      },
    };

    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountService,
      });

    const result =
      await service.createParty({
        companyId:
          "64b000000000000000000001",
        userId:
          "64b000000000000000000002",
        type:
          "customer",
        payload: {
          accountCode:
            "CUS001",
          accountName:
            "ABC Traders",
          description:
            "Delhi customer",

          nature:
            "liability",

          accountType:
            "accounts_payable",
        },
      });

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].payload.nature,
      "asset"
    );

    assert.equal(
      calls[0].payload.accountType,
      "accounts_receivable"
    );

    assert.equal(
      calls[0].payload.accountName,
      "ABC Traders"
    );

    assert.equal(
      result.partyType,
      "customer"
    );
  }
);

test(
  "creates vendor as an accounts_payable liability ledger",
  async () => {
    const calls = [];

    const chartOfAccountService = {
      async createAccount(input) {
        calls.push(input);

        return {
          _id: "vendor-1",
          ...input.payload,
        };
      },
    };

    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountService,
      });

    const result =
      await service.createParty({
        companyId:
          "64b000000000000000000001",
        userId:
          "64b000000000000000000002",
        type:
          "vendor",
        payload: {
          accountCode:
            "VEN001",
          accountName:
            "XYZ Supplier",

          nature:
            "asset",

          accountType:
            "accounts_receivable",
        },
      });

    assert.equal(
      calls[0].payload.nature,
      "liability"
    );

    assert.equal(
      calls[0].payload.accountType,
      "accounts_payable"
    );

    assert.equal(
      result.partyType,
      "vendor"
    );
  }
);

test(
  "gets only a customer receivable ledger as customer",
  async () => {
    const chartOfAccountService = {
      async getAccount() {
        return {
          _id:
            "64b000000000000000000003",
          accountCode:
            "CUS001",
          accountName:
            "ABC Traders",
          nature:
            "asset",
          accountType:
            "accounts_receivable",
          status:
            "active",
        };
      },
    };

    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountService,
      });

    const result =
      await service.getParty({
        companyId:
          "64b000000000000000000001",
        accountId:
          "64b000000000000000000003",
        type:
          "customer",
      });

    assert.equal(
      result.partyType,
      "customer"
    );

    assert.equal(
      result.accountType,
      "accounts_receivable"
    );
  }
);

test(
  "rejects payable ledger when requested as customer",
  async () => {
    const chartOfAccountService = {
      async getAccount() {
        return {
          _id:
            "64b000000000000000000004",
          accountCode:
            "VEN001",
          accountName:
            "XYZ Supplier",
          nature:
            "liability",
          accountType:
            "accounts_payable",
          status:
            "active",
        };
      },
    };

    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountService,
      });

    await assert.rejects(
      () =>
        service.getParty({
          companyId:
            "64b000000000000000000001",
          accountId:
            "64b000000000000000000004",
          type:
            "customer",
        }),
      /customer|receivable/i
    );
  }
);

test(
  "updates customer while protecting nature and account type",
  async () => {
    const calls = [];

    const chartOfAccountService = {
      async getAccount() {
        return {
          _id:
            "64b000000000000000000003",
          accountCode:
            "CUS001",
          accountName:
            "ABC Traders",
          nature:
            "asset",
          accountType:
            "accounts_receivable",
          status:
            "active",
        };
      },

      async updateAccount(input) {
        calls.push(input);

        return {
          _id:
            input.accountId,
          nature:
            "asset",
          accountType:
            "accounts_receivable",
          ...input.payload,
        };
      },
    };

    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    const service =
      new AccountPartyService({
        chartOfAccountService,
      });

    await service.updateParty({
      companyId:
        "64b000000000000000000001",
      accountId:
        "64b000000000000000000003",
      userId:
        "64b000000000000000000002",
      type:
        "customer",
      payload: {
        accountName:
          "ABC Traders Updated",
        description:
          "Updated",

        nature:
          "liability",

        accountType:
          "accounts_payable",
      },
    });

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].payload.accountName,
      "ABC Traders Updated"
    );

    assert.equal(
      Object.hasOwn(
        calls[0].payload,
        "nature"
      ),
      false
    );

    assert.equal(
      Object.hasOwn(
        calls[0].payload,
        "accountType"
      ),
      false
    );
  }
);

test(
  "does not expose physical party deletion",
  async () => {
    const {
      AccountPartyService,
    } =
      await import(
        "../services/accountParty.service.js"
      );

    assert.equal(
      AccountPartyService.prototype.deleteParty,
      undefined
    );
  }
);
