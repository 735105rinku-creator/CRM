import assert from "node:assert/strict";
import { test } from "node:test";


test(
  "TrialBalanceRepository module exists",
  async () => {

    await assert.doesNotReject(
      async () => {

        const module =
          await import(
            "../repositories/trialBalance.repository.js"
          );

        assert.ok(
          module.TrialBalanceRepository,
          "TrialBalanceRepository export is required."
        );

      }
    );

  }
);


test(
  "TrialBalanceRepository lists all company accounts without filtering inactive accounts",
  async () => {

    const {
      TrialBalanceRepository,
    } = await import(
      "../repositories/trialBalance.repository.js"
    );


    let capturedFilter = null;


    const accounts = [
      {
        _id: "account-1",
        accountCode: "1001",
        status: "active",
      },
      {
        _id: "account-2",
        accountCode: "1002",
        status: "inactive",
      },
    ];


    const chartOfAccountModel = {

      find(filter) {

        capturedFilter =
          filter;

        return {

          select() {
            return this;
          },

          sort() {
            return this;
          },

          lean() {
            return Promise.resolve(
              accounts
            );
          },

        };

      },

    };


    const repository =
      new TrialBalanceRepository({
        chartOfAccountModel,
        journalEntryModel: {},
      });


    const result =
      await repository.list({
        companyId: "company-1",
      });


    assert.equal(
      capturedFilter.companyId,
      "company-1"
    );

    assert.equal(
      Object.hasOwn(
        capturedFilter,
        "status"
      ),
      false,
      "Trial Balance must include inactive accounts too."
    );

    assert.equal(
      result.length,
      2
    );

  }
);


test(
  "TrialBalanceRepository reads only posted journal lines and never uses write aggregation stages",
  async () => {

    const {
      TrialBalanceRepository,
    } = await import(
      "../repositories/trialBalance.repository.js"
    );


    let capturedPipeline = null;


    const journalEntryModel = {

      aggregate(pipeline) {

        capturedPipeline =
          pipeline;

        return Promise.resolve(
          []
        );

      },

    };


    const repository =
      new TrialBalanceRepository({
        chartOfAccountModel: {},
        journalEntryModel,
      });


    await repository
      .findPostedLinesByAccount({
        companyId:
          "64b64c7f0000000000000001",

        accountId:
          "64b64c7f0000000000000002",

        to:
          "2026-04-30",
      });


    const matchStage =
      capturedPipeline.find(
        (stage) => stage.$match
      );


    assert.equal(
      matchStage.$match.status,
      "posted"
    );


    const serialized =
      JSON.stringify(
        capturedPipeline
      );


    assert.equal(
      serialized.includes(
        '"$out"'
      ),
      false
    );

    assert.equal(
      serialized.includes(
        '"$merge"'
      ),
      false
    );

  }
);
