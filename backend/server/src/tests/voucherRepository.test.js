import assert from "node:assert/strict";
import { test } from "node:test";
import {
  existsSync,
} from "node:fs";

const repositoryPath =
  new URL(
    "../repositories/voucher.repository.js",
    import.meta.url
  );

test(
  "Voucher repository exposes company-scoped voucher operations",
  async () => {
    assert.equal(
      existsSync(repositoryPath),
      true,
      "src/repositories/voucher.repository.js must exist"
    );

    const module =
      await import(
        repositoryPath.href
      );

    const repository =
      module.default;

    assert.ok(
      repository,
      "Voucher repository default export is required"
    );

    const requiredMethods = [
      "create",
      "findById",
      "list",
      "updateDraftById",
      "postById",
      "voidById",
      "findLastVoucherNumber",
    ];

    for (
      const method
      of requiredMethods
    ) {
      assert.equal(
        typeof repository[method],
        "function",
        `Voucher repository must expose ${method}()`
      );
    }
  }
);

test(
  "findById forwards an optional Mongo session to the Voucher query",
  async () => {

    const repositoryModule =
      await import(
        repositoryPath.href
      );

    const repository =
      repositoryModule.default;


    const modelModule =
      await import(
        "../models/Voucher.js"
      );

    const Voucher =
      modelModule.default;


    const fakeSession = {
      id: "voucher-session",
    };


    let receivedSession =
      null;


    const originalFindOne =
      Voucher.findOne;


    Voucher.findOne =
      (filter) => {

        const query = {

          session(session) {
            receivedSession =
              session;

            return query;
          },

          async lean() {
            return {
              _id:
                filter._id,

              companyId:
                filter.companyId,
            };
          },

        };


        return query;

      };


    try {

      await repository.findById({
        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000010",

        session:
          fakeSession,
      });


      assert.equal(
        receivedSession,
        fakeSession
      );

    } finally {

      Voucher.findOne =
        originalFindOne;

    }

  }
);

test(
  "postById forwards Mongo session to the atomic Voucher update",
  async () => {

    const repositoryModule =
      await import(
        repositoryPath.href
      );

    const repository =
      repositoryModule.default;


    const modelModule =
      await import(
        "../models/Voucher.js"
      );

    const Voucher =
      modelModule.default;


    const fakeSession = {
      id: "post-voucher-session",
    };


    let receivedOptions =
      null;


    const originalFindOneAndUpdate =
      Voucher.findOneAndUpdate;


    Voucher.findOneAndUpdate =
      (
        filter,
        update,
        options
      ) => {

        receivedOptions =
          options;


        return {
          async lean() {
            return {
              _id:
                filter._id,

              status:
                update.$set.status,

              journalEntryId:
                update.$set.journalEntryId,
            };
          },
        };

      };


    try {

      await repository.postById({
        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000010",

        journalEntryId:
          "64f000000000000000000099",

        userId:
          "64f000000000000000000009",

        session:
          fakeSession,
      });


      assert.equal(
        receivedOptions?.session,
        fakeSession
      );

    } finally {

      Voucher.findOneAndUpdate =
        originalFindOneAndUpdate;

    }

  }
);

test(
  "voidById forwards Mongo session to the atomic Voucher update",
  async () => {

    const repositoryModule =
      await import(
        repositoryPath.href
      );

    const repository =
      repositoryModule.default;


    const modelModule =
      await import(
        "../models/Voucher.js"
      );

    const Voucher =
      modelModule.default;


    const fakeSession = {
      id: "void-voucher-session",
    };


    let receivedOptions =
      null;


    const originalFindOneAndUpdate =
      Voucher.findOneAndUpdate;


    Voucher.findOneAndUpdate =
      (
        filter,
        update,
        options
      ) => {

        receivedOptions =
          options;


        return {
          async lean() {
            return {
              _id:
                filter._id,

              status:
                update.$set.status,

              voidReason:
                update.$set.voidReason,
            };
          },
        };

      };


    try {

      await repository.voidById({
        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000010",

        userId:
          "64f000000000000000000009",

        reason:
          "Incorrect payment",

        session:
          fakeSession,
      });


      assert.equal(
        receivedOptions?.session,
        fakeSession
      );

    } finally {

      Voucher.findOneAndUpdate =
        originalFindOneAndUpdate;

    }

  }
);
