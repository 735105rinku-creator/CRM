import test from "node:test";
import assert from "node:assert/strict";


test(
  "Account Party validator module exists",
  async () => {
    const module =
      await import(
        "../validators/accountParty.validator.js"
      );

    assert.ok(
      module.createAccountPartySchema
    );

    assert.ok(
      module.updateAccountPartySchema
    );

    assert.ok(
      module.accountPartyIdParamSchema
    );
  }
);


test(
  "customer or vendor create accepts normal ledger master fields",
  async () => {
    const {
      createAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );

    const {
      value,
      error,
    } =
      createAccountPartySchema.validate(
        {
          accountCode:
            "CUS-001",

          accountName:
            "ABC Traders",

          description:
            "Customer ledger",

          openingBalance:
            1000,

          openingBalanceType:
            "debit",

          status:
            "active",
        },
        {
          abortEarly:
            false,
        }
      );


    assert.equal(
      error,
      undefined
    );

    assert.equal(
      value.accountCode,
      "CUS-001"
    );

    assert.equal(
      value.accountName,
      "ABC Traders"
    );
  }
);


test(
  "party create requires account code",
  async () => {
    const {
      createAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );

    const {
      error,
    } =
      createAccountPartySchema.validate({
        accountName:
          "ABC Traders",
      });


    assert.ok(
      error
    );
  }
);


test(
  "party create requires account name",
  async () => {
    const {
      createAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );

    const {
      error,
    } =
      createAccountPartySchema.validate({
        accountCode:
          "CUS001",
      });


    assert.ok(
      error
    );
  }
);


test(
  "party create forbids client controlled nature and account type",
  async () => {
    const {
      createAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );


    const {
      error,
    } =
      createAccountPartySchema.validate(
        {
          accountCode:
            "CUS001",

          accountName:
            "ABC Traders",

          nature:
            "liability",

          accountType:
            "accounts_payable",
        },
        {
          abortEarly:
            false,
        }
      );


    assert.ok(
      error
    );

    const paths =
      error.details.map(
        detail =>
          detail.path.join(".")
      );


    assert.ok(
      paths.includes(
        "nature"
      )
    );

    assert.ok(
      paths.includes(
        "accountType"
      )
    );
  }
);


test(
  "party create forbids company and backend controlled fields",
  async () => {
    const {
      createAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );


    const {
      error,
    } =
      createAccountPartySchema.validate(
        {
          accountCode:
            "CUS001",

          accountName:
            "ABC Traders",

          companyId:
            "64b000000000000000000001",

          createdBy:
            "64b000000000000000000002",
        },
        {
          abortEarly:
            false,
        }
      );


    assert.ok(
      error
    );

    const paths =
      error.details.map(
        detail =>
          detail.path.join(".")
      );


    assert.ok(
      paths.includes(
        "companyId"
      )
    );

    assert.ok(
      paths.includes(
        "createdBy"
      )
    );
  }
);


test(
  "party update allows deactivation",
  async () => {
    const {
      updateAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );


    const {
      value,
      error,
    } =
      updateAccountPartySchema.validate({
        status:
          "inactive",
      });


    assert.equal(
      error,
      undefined
    );

    assert.equal(
      value.status,
      "inactive"
    );
  }
);


test(
  "party update rejects invalid status",
  async () => {
    const {
      updateAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );


    const {
      error,
    } =
      updateAccountPartySchema.validate({
        status:
          "deleted",
      });


    assert.ok(
      error
    );
  }
);


test(
  "party update forbids changing accounting identity fields",
  async () => {
    const {
      updateAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );


    const {
      error,
    } =
      updateAccountPartySchema.validate(
        {
          accountCode:
            "NEW001",

          nature:
            "liability",

          accountType:
            "accounts_payable",

          openingBalance:
            5000,

          openingBalanceType:
            "credit",
        },
        {
          abortEarly:
            false,
        }
      );


    assert.ok(
      error
    );

    const paths =
      error.details.map(
        detail =>
          detail.path.join(".")
      );


    assert.ok(
      paths.includes(
        "accountCode"
      )
    );

    assert.ok(
      paths.includes(
        "nature"
      )
    );

    assert.ok(
      paths.includes(
        "accountType"
      )
    );

    assert.ok(
      paths.includes(
        "openingBalance"
      )
    );

    assert.ok(
      paths.includes(
        "openingBalanceType"
      )
    );
  }
);


test(
  "party update rejects empty payload",
  async () => {
    const {
      updateAccountPartySchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );


    const {
      error,
    } =
      updateAccountPartySchema.validate(
        {}
      );


    assert.ok(
      error
    );
  }
);


test(
  "party id accepts valid Mongo ObjectId",
  async () => {
    const {
      accountPartyIdParamSchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );


    const {
      value,
      error,
    } =
      accountPartyIdParamSchema.validate({
        id:
          "64b000000000000000000003",
      });


    assert.equal(
      error,
      undefined
    );

    assert.equal(
      value.id,
      "64b000000000000000000003"
    );
  }
);


test(
  "party id rejects invalid Mongo ObjectId",
  async () => {
    const {
      accountPartyIdParamSchema,
    } =
      await import(
        "../validators/accountParty.validator.js"
      );


    const {
      error,
    } =
      accountPartyIdParamSchema.validate({
        id:
          "not-an-object-id",
      });


    assert.ok(
      error
    );

    assert.match(
      error.details[0]
        .message,
      /invalid.*party.*id/i
    );
  }
);
