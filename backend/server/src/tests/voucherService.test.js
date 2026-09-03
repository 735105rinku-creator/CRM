import assert from "node:assert/strict";
import { test } from "node:test";
import {
  existsSync,
} from "node:fs";

const servicePath =
  new URL(
    "../services/voucher.service.js",
    import.meta.url
  );


async function loadService() {

  assert.equal(
    existsSync(servicePath),
    true,
    "src/services/voucher.service.js must exist"
  );

  return import(
    servicePath.href
  );
}


test(
  "resolves India-style financial year boundaries",
  async () => {

    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository: {},
      });


    assert.equal(
      service.resolveFinancialYear(
        "2026-04-01"
      ),
      "2026-27"
    );


    assert.equal(
      service.resolveFinancialYear(
        "2027-03-31"
      ),
      "2026-27"
    );


    assert.equal(
      service.resolveFinancialYear(
        "2027-04-01"
      ),
      "2027-28"
    );

  }
);


test(
  "builds the next Tally-style voucher number",
  async () => {

    let receivedQuery =
      null;


    const voucherRepository = {

      async findLastVoucherNumber(
        query
      ) {

        receivedQuery =
          query;


        return {
          voucherNumber:
            "PV/2026-27/000041",
        };
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const voucherNumber =
      await service
        .buildVoucherNumber({

          companyId:
            "64f000000000000000000001",

          voucherType:
            "payment",

          voucherDate:
            "2026-09-03",

        });


    assert.equal(
      voucherNumber,
      "PV/2026-27/000042"
    );


    assert.deepEqual(
      receivedQuery,
      {

        companyId:
          "64f000000000000000000001",

        financialYear:
          "2026-27",

        voucherType:
          "payment",

        prefix:
          "PV",

      }
    );

  }
);


test(
  "starts a voucher type sequence at 000001",
  async () => {

    const voucherRepository = {

      async findLastVoucherNumber() {

        return null;
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const voucherNumber =
      await service
        .buildVoucherNumber({

          companyId:
            "64f000000000000000000001",

          voucherType:
            "journal",

          voucherDate:
            "2026-04-01",

        });


    assert.equal(
      voucherNumber,
      "JV/2026-27/000001"
    );

  }
);

test(
  "lists vouchers with company-scoped query",
  async () => {

    let receivedQuery =
      null;


    const voucherRepository = {

      async list(
        query
      ) {

        receivedQuery =
          query;

        return [];
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const result =
      await service.getVouchers({

        companyId:
          "64f000000000000000000001",

        query: {
          voucherType:
            "payment",

          status:
            "draft",
        },

      });


    assert.deepEqual(
      result,
      []
    );


    assert.deepEqual(
      receivedQuery,
      {
        companyId:
          "64f000000000000000000001",

        voucherType:
          "payment",

        status:
          "draft",
      }
    );

  }
);


test(
  "gets one company-scoped voucher by id",
  async () => {

    let receivedQuery =
      null;


    const voucherRepository = {

      async findById(
        query
      ) {

        receivedQuery =
          query;

        return {
          _id:
            query.voucherId,

          voucherNumber:
            "JV/2026-27/000001",
        };
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const voucher =
      await service.getVoucherById({

        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000002",

      });


    assert.equal(
      voucher.voucherNumber,
      "JV/2026-27/000001"
    );


    assert.deepEqual(
      receivedQuery,
      {
        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000002",
      }
    );

  }
);


test(
  "creates a draft voucher with financial year, generated number and derived totals",
  async () => {

    let createPayload =
      null;


    const voucherRepository = {

      async findLastVoucherNumber() {
        return null;
      },


      async create(
        payload
      ) {

        createPayload =
          payload;

        return payload;
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const result =
      await service.createVoucher({

        companyId:
          "64f000000000000000000001",

        userId:
          "64f000000000000000000009",

        payload: {

          voucherType:
            "payment",

          voucherDate:
            "2026-09-03",

          narration:
            "Office payment",

          lines: [
            {
              accountId:
                "64f000000000000000000002",

              debit:
                1250,

              credit:
                0,
            },
            {
              accountId:
                "64f000000000000000000003",

              debit:
                0,

              credit:
                1250,
            },
          ],

        },

      });


    assert.equal(
      result.voucherNumber,
      "PV/2026-27/000001"
    );


    assert.equal(
      createPayload.financialYear,
      "2026-27"
    );


    assert.equal(
      createPayload.status,
      "draft"
    );


    assert.equal(
      createPayload.totalDebit,
      1250
    );


    assert.equal(
      createPayload.totalCredit,
      1250
    );


    assert.equal(
      createPayload.createdBy,
      "64f000000000000000000009"
    );


    assert.equal(
      createPayload.updatedBy,
      "64f000000000000000000009"
    );

  }
);


test(
  "updates only through the repository draft update contract",
  async () => {

    let receivedUpdate =
      null;


    const voucherRepository = {

      async updateDraftById(
        input
      ) {

        receivedUpdate =
          input;

        return {
          _id:
            input.voucherId,

          status:
            "draft",

          ...input.payload,
        };
      },

    };


    const {
      VoucherService,
    } =
      await loadService();


    const service =
      new VoucherService({
        voucherRepository,
      });


    const result =
      await service.updateDraftVoucher({

        companyId:
          "64f000000000000000000001",

        voucherId:
          "64f000000000000000000002",

        userId:
          "64f000000000000000000009",

        payload: {
          narration:
            "Updated voucher narration",
        },

      });


    assert.equal(
      result.status,
      "draft"
    );


    assert.equal(
      receivedUpdate.companyId,
      "64f000000000000000000001"
    );


    assert.equal(
      receivedUpdate.voucherId,
      "64f000000000000000000002"
    );


    assert.equal(
      receivedUpdate.payload.updatedBy,
      "64f000000000000000000009"
    );

  }
);
