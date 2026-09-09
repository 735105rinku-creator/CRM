import assert from "node:assert/strict";
import { test } from "node:test";
import {
  existsSync,
} from "node:fs";

const validatorPath =
  new URL(
    "../validators/voucher.validator.js",
    import.meta.url
  );

async function loadValidator() {
  assert.equal(
    existsSync(validatorPath),
    true,
    "src/validators/voucher.validator.js must exist"
  );

  return import(
    validatorPath.href
  );
}

const validVoucher = {
  voucherType: "payment",
  voucherDate: "2026-09-03",
  narration: "Office electricity payment",
  lines: [
    {
      accountId:
        "64f000000000000000000001",
      debit: 1000,
      credit: 0,
    },
    {
      accountId:
        "64f000000000000000000002",
      debit: 0,
      credit: 1000,
    },
  ],
};

test(
  "accepts a valid balanced voucher",
  async () => {
    const {
      createVoucherSchema,
    } = await loadValidator();

    const {
      error,
      value,
    } =
      createVoucherSchema.validate(
        validVoucher,
        {
          abortEarly: false,
        }
      );

    assert.equal(
      error,
      undefined
    );

    assert.equal(
      value.voucherType,
      "payment"
    );
  }
);

test(
  "rejects an unsupported voucher type",
  async () => {
    const {
      createVoucherSchema,
    } = await loadValidator();

    const {
      error,
    } =
      createVoucherSchema.validate({
        ...validVoucher,
        voucherType:
          "unknown_voucher",
      });

    assert.ok(error);
  }
);

test(
  "requires at least two voucher lines",
  async () => {
    const {
      createVoucherSchema,
    } = await loadValidator();

    const {
      error,
    } =
      createVoucherSchema.validate({
        ...validVoucher,
        lines: [
          validVoucher.lines[0],
        ],
      });

    assert.ok(error);
  }
);

test(
  "rejects debit and credit on the same line",
  async () => {
    const {
      createVoucherSchema,
    } = await loadValidator();

    const {
      error,
    } =
      createVoucherSchema.validate({
        ...validVoucher,
        lines: [
          {
            accountId:
              "64f000000000000000000001",
            debit: 1000,
            credit: 100,
          },
          {
            accountId:
              "64f000000000000000000002",
            debit: 0,
            credit: 900,
          },
        ],
      });

    assert.ok(error);
  }
);

test(
  "rejects an unbalanced voucher",
  async () => {
    const {
      createVoucherSchema,
    } = await loadValidator();

    const {
      error,
    } =
      createVoucherSchema.validate({
        ...validVoucher,
        lines: [
          {
            accountId:
              "64f000000000000000000001",
            debit: 1000,
            credit: 0,
          },
          {
            accountId:
              "64f000000000000000000002",
            debit: 0,
            credit: 900,
          },
        ],
      });

    assert.ok(error);
  }
);

test(
  "does not allow client-controlled voucher status",
  async () => {
    const {
      createVoucherSchema,
    } = await loadValidator();

    const {
      error,
    } =
      createVoucherSchema.validate({
        ...validVoucher,
        status:
          "posted",
      });

    assert.ok(error);
  }
);

test(
  "supports draft voucher updates and voucher query contracts",
  async () => {
    const {
      updateVoucherSchema,
      voucherQuerySchema,
      voucherIdParamSchema,
    } = await loadValidator();

    const updateResult =
      updateVoucherSchema.validate({
        narration:
          "Updated narration",
      });

    assert.equal(
      updateResult.error,
      undefined
    );

    const forbiddenStatus =
      updateVoucherSchema.validate({
        status:
          "posted",
      });

    assert.ok(
      forbiddenStatus.error
    );

    const queryResult =
      voucherQuerySchema.validate({
        voucherType:
          "payment",
        status:
          "draft",
        financialYear:
          "2026-27",
        sortBy:
          "voucherDate",
        sortOrder:
          "desc",
      });

    assert.equal(
      queryResult.error,
      undefined
    );

    const idResult =
      voucherIdParamSchema.validate({
        voucherId:
          "64f000000000000000000001",
      });

    assert.equal(
      idResult.error,
      undefined
    );
  }
);
