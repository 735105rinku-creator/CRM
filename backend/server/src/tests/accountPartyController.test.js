import test from "node:test";
import assert from "node:assert/strict";

test(
  "AccountPartyController module exists",
  async () => {
    const module =
      await import(
        "../controllers/accountParty.controller.js"
      );

    assert.equal(
      typeof module.AccountPartyController,
      "function"
    );
  }
);

test(
  "lists customers using accounting company context",
  async () => {
    const calls = [];

    const accountPartyService = {
      async listParties(input) {
        calls.push(input);

        return [
          {
            _id: "customer-1",
            partyType: "customer",
          },
        ];
      },
    };

    const {
      AccountPartyController,
    } =
      await import(
        "../controllers/accountParty.controller.js"
      );

    const controller =
      new AccountPartyController({
        accountPartyService,
      });

    const req = {
      accountingAccess: {
        companyId:
          "64b000000000000000000001",
      },
      query: {
        search: "ABC",
      },
    };

    let statusCode = null;
    let body = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },

      json(payload) {
        body = payload;
        return this;
      },
    };

    await controller
      .listCustomers(
        req,
        res
      );

    assert.equal(
      calls[0].type,
      "customer"
    );

    assert.equal(
      calls[0].companyId,
      "64b000000000000000000001"
    );

    assert.deepEqual(
      calls[0].query,
      {
        search: "ABC",
      }
    );

    assert.equal(
      statusCode,
      200
    );

    assert.equal(
      body.statusCode,
      200
    );
  }
);

test(
  "creates vendor using authenticated user and accounting company",
  async () => {
    const calls = [];

    const accountPartyService = {
      async createParty(input) {
        calls.push(input);

        return {
          _id: "vendor-1",
          partyType: "vendor",
        };
      },
    };

    const {
      AccountPartyController,
    } =
      await import(
        "../controllers/accountParty.controller.js"
      );

    const controller =
      new AccountPartyController({
        accountPartyService,
      });

    const req = {
      accountingAccess: {
        companyId:
          "64b000000000000000000001",
      },

      user: {
        _id:
          "64b000000000000000000002",
      },

      body: {
        accountCode:
          "VEN001",
        accountName:
          "XYZ Supplier",
      },
    };

    let statusCode = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },

      json() {
        return this;
      },
    };

    await controller
      .createVendor(
        req,
        res
      );

    assert.equal(
      calls[0].type,
      "vendor"
    );

    assert.equal(
      calls[0].userId,
      "64b000000000000000000002"
    );

    assert.equal(
      calls[0].payload.accountCode,
      "VEN001"
    );

    assert.equal(
      statusCode,
      201
    );
  }
);

test(
  "gets customer by account id",
  async () => {
    const calls = [];

    const accountPartyService = {
      async getParty(input) {
        calls.push(input);

        return {
          _id:
            input.accountId,
          partyType:
            input.type,
        };
      },
    };

    const {
      AccountPartyController,
    } =
      await import(
        "../controllers/accountParty.controller.js"
      );

    const controller =
      new AccountPartyController({
        accountPartyService,
      });

    const req = {
      accountingAccess: {
        companyId:
          "64b000000000000000000001",
      },

      params: {
        id:
          "64b000000000000000000003",
      },
    };

    const res = {
      status() {
        return this;
      },

      json() {
        return this;
      },
    };

    await controller
      .getCustomer(
        req,
        res
      );

    assert.equal(
      calls[0].type,
      "customer"
    );

    assert.equal(
      calls[0].accountId,
      "64b000000000000000000003"
    );
  }
);

test(
  "updates vendor through party service",
  async () => {
    const calls = [];

    const accountPartyService = {
      async updateParty(input) {
        calls.push(input);

        return {
          _id:
            input.accountId,
          partyType:
            input.type,
        };
      },
    };

    const {
      AccountPartyController,
    } =
      await import(
        "../controllers/accountParty.controller.js"
      );

    const controller =
      new AccountPartyController({
        accountPartyService,
      });

    const req = {
      accountingAccess: {
        companyId:
          "64b000000000000000000001",
      },

      user: {
        _id:
          "64b000000000000000000002",
      },

      params: {
        id:
          "64b000000000000000000004",
      },

      body: {
        accountName:
          "Updated Vendor",
      },
    };

    const res = {
      status() {
        return this;
      },

      json() {
        return this;
      },
    };

    await controller
      .updateVendor(
        req,
        res
      );

    assert.equal(
      calls[0].type,
      "vendor"
    );

    assert.equal(
      calls[0].payload.accountName,
      "Updated Vendor"
    );
  }
);

test(
  "rejects missing accounting company context",
  async () => {
    const {
      AccountPartyController,
    } =
      await import(
        "../controllers/accountParty.controller.js"
      );

    const controller =
      new AccountPartyController({
        accountPartyService: {
          listParties:
            async () => [],
        },
      });

    const req = {
      query: {},
    };

    const res = {};

    await assert.rejects(
      () =>
        controller.listCustomers(
          req,
          res
        ),
      /company context/i
    );
  }
);
