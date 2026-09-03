import assert from "node:assert/strict";
import { test } from "node:test";

test(
  "findById forwards Mongo session to the Chart of Account query",
  async () => {

    const repositoryModule =
      await import(
        "../repositories/chartOfAccount.repository.js"
      );

    const repository =
      repositoryModule.default;


    const modelModule =
      await import(
        "../models/ChartOfAccount.js"
      );

    const ChartOfAccount =
      modelModule.default;


    const fakeSession = {
      id: "chart-account-session",
    };


    let receivedSession =
      null;


    const originalFindOne =
      ChartOfAccount.findOne;


    ChartOfAccount.findOne =
      () => {

        const query = {

          session(session) {
            receivedSession =
              session;

            return query;
          },

          populate() {
            return query;
          },

          async lean() {
            return {
              _id:
                "64f000000000000000000002",

              accountCode:
                "EXP001",

              accountName:
                "Expense",

              status:
                "active",
            };
          },

        };


        return query;

      };


    try {

      await repository.findById({
        companyId:
          "64f000000000000000000001",

        accountId:
          "64f000000000000000000002",

        session:
          fakeSession,
      });


      assert.equal(
        receivedSession,
        fakeSession
      );

    } finally {

      ChartOfAccount.findOne =
        originalFindOne;

    }

  }
);
