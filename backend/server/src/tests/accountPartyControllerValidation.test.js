import test from "node:test";
import assert from "node:assert/strict";

import {
  AccountPartyController,
} from "../controllers/accountParty.controller.js";


const createResponse = () => {
  return {
    statusCode: 200,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };
};


const baseRequest = () => ({
  accountingAccess: {
    companyId:
      "64b000000000000000000001",
  },

  user: {
    _id:
      "64b000000000000000000002",
  },

  params: {},

  query: {},

  body: {},
});


test(
  "create customer rejects client controlled nature and accountType before service call",
  async () => {
    let called = false;

    const controller =
      new AccountPartyController({
        accountPartyService: {
          async createParty() {
            called = true;

            return {
              _id:
                "64b000000000000000000003",
            };
          },
        },
      });


    const req =
      baseRequest();

    req.body = {
      accountCode:
        "CUS001",

      accountName:
        "ABC Customer",

      nature:
        "liability",

      accountType:
        "accounts_payable",
    };


    await assert.rejects(
      () =>
        controller.createCustomer(
          req,
          createResponse()
        ),
      (error) => {
        assert.equal(
          error.statusCode,
          400
        );

        return true;
      }
    );


    assert.equal(
      called,
      false
    );
  }
);


test(
  "create vendor rejects missing account name before service call",
  async () => {
    let called = false;

    const controller =
      new AccountPartyController({
        accountPartyService: {
          async createParty() {
            called = true;
            return {};
          },
        },
      });


    const req =
      baseRequest();

    req.body = {
      accountCode:
        "VEN001",
    };


    await assert.rejects(
      () =>
        controller.createVendor(
          req,
          createResponse()
        ),
      (error) => {
        assert.equal(
          error.statusCode,
          400
        );

        return true;
      }
    );


    assert.equal(
      called,
      false
    );
  }
);


test(
  "get customer rejects invalid party id before service call",
  async () => {
    let called = false;

    const controller =
      new AccountPartyController({
        accountPartyService: {
          async getParty() {
            called = true;
            return {};
          },
        },
      });


    const req =
      baseRequest();

    req.params = {
      id:
        "invalid-id",
    };


    await assert.rejects(
      () =>
        controller.getCustomer(
          req,
          createResponse()
        ),
      (error) => {
        assert.equal(
          error.statusCode,
          400
        );

        assert.match(
          error.message,
          /invalid.*party.*id/i
        );

        return true;
      }
    );


    assert.equal(
      called,
      false
    );
  }
);


test(
  "update vendor rejects changing account type before service call",
  async () => {
    let called = false;

    const controller =
      new AccountPartyController({
        accountPartyService: {
          async updateParty() {
            called = true;
            return {};
          },
        },
      });


    const req =
      baseRequest();

    req.params = {
      id:
        "64b000000000000000000003",
    };

    req.body = {
      accountType:
        "accounts_receivable",
    };


    await assert.rejects(
      () =>
        controller.updateVendor(
          req,
          createResponse()
        ),
      (error) => {
        assert.equal(
          error.statusCode,
          400
        );

        return true;
      }
    );


    assert.equal(
      called,
      false
    );
  }
);


test(
  "update customer rejects empty payload before service call",
  async () => {
    let called = false;

    const controller =
      new AccountPartyController({
        accountPartyService: {
          async updateParty() {
            called = true;
            return {};
          },
        },
      });


    const req =
      baseRequest();

    req.params = {
      id:
        "64b000000000000000000003",
    };

    req.body = {};


    await assert.rejects(
      () =>
        controller.updateCustomer(
          req,
          createResponse()
        ),
      (error) => {
        assert.equal(
          error.statusCode,
          400
        );

        return true;
      }
    );


    assert.equal(
      called,
      false
    );
  }
);


test(
  "create customer passes Joi normalized payload to party service",
  async () => {
    const calls = [];

    const controller =
      new AccountPartyController({
        accountPartyService: {
          async createParty(input) {
            calls.push(input);

            return {
              _id:
                "64b000000000000000000003",
            };
          },
        },
      });


    const req =
      baseRequest();

    req.body = {
      accountCode:
        "cus-001",

      accountName:
        "  ABC Traders  ",
    };


    await controller.createCustomer(
      req,
      createResponse()
    );


    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].payload.accountCode,
      "CUS-001"
    );

    assert.equal(
      calls[0].payload.accountName,
      "ABC Traders"
    );

    assert.equal(
      calls[0].payload.status,
      "active"
    );

    assert.equal(
      calls[0].payload.openingBalance,
      0
    );
  }
);
