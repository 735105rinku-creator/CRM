import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";

import Voucher from "../models/Voucher.js";

const objectId = () => new mongoose.Types.ObjectId();

const makeVoucher = (overrides = {}) =>
  new Voucher({
    companyId: objectId(),
    voucherNumber: "JV/2026-27/000001",
    voucherType: "journal",
    financialYear: "2026-27",
    voucherDate: new Date("2026-09-11T00:00:00.000Z"),
    lines: [
      {
        accountId: objectId(),
        accountCode: "1000",
        accountName: "Cash",
        debit: 100,
        credit: 0,
      },
      {
        accountId: objectId(),
        accountCode: "2000",
        accountName: "Capital",
        debit: 0,
        credit: 100,
      },
    ],
    totalDebit: 100,
    totalCredit: 100,
    ...overrides,
  });

test("Voucher persists Accounts proof attachment metadata", () => {
  const uploadedBy = objectId();

  const voucher = makeVoucher({
    attachments: [
      {
        originalName: "proof.pdf",
        storedName: "generated-proof.pdf",
        fileUrl: "/uploads/accounts-proofs/generated-proof.pdf",
        storageKey: "accounts-proofs/generated-proof.pdf",
        mimeType: "application/pdf",
        fileSize: 1024,
        uploadedBy,
        uploadedAt: new Date("2026-09-11T10:00:00.000Z"),
      },
    ],
  });

  const error = voucher.validateSync();

  assert.equal(error, undefined);
  assert.equal(voucher.attachments.length, 1);
  assert.equal(voucher.attachments[0].originalName, "proof.pdf");
  assert.equal(voucher.attachments[0].mimeType, "application/pdf");
  assert.equal(voucher.attachments[0].fileSize, 1024);
});

test("existing Voucher without attachments remains valid", () => {
  const voucher = makeVoucher();

  const error = voucher.validateSync();

  assert.equal(error, undefined);
});

test("Accounts proof uploader exposes 10 MB PDF/JPG/JPEG/PNG contract", async () => {
  const uploadModule = await import("../middleware/upload.middleware.js");

  assert.ok(
    uploadModule.uploadAccountsProof,
    "uploadAccountsProof must be exported"
  );

  assert.equal(
    uploadModule.uploadAccountsProof.limits.fileSize,
    10 * 1024 * 1024
  );

  assert.equal(
    typeof uploadModule.toPublicAccountsProofUrl,
    "function"
  );
});

test("Accounts proof URL helper targets accounts-proofs storage", async () => {
  const uploadModule = await import("../middleware/upload.middleware.js");

  assert.equal(
    uploadModule.toPublicAccountsProofUrl({ filename: "proof.pdf" }),
    "/uploads/accounts-proofs/proof.pdf"
  );
});

test("Accounts proof uploader accepts approved file types and rejects others", async () => {
  const uploadModule = await import("../middleware/upload.middleware.js");
  const filter = uploadModule.uploadAccountsProof?.fileFilter;

  assert.equal(typeof filter, "function");

  const accepted = [
    ["proof.pdf", "application/pdf"],
    ["proof.jpg", "image/jpeg"],
    ["proof.jpeg", "image/jpeg"],
    ["proof.png", "image/png"],
  ];

  for (const [originalname, mimetype] of accepted) {
    let acceptedValue = null;
    let acceptedError = null;

    filter(
      {},
      { originalname, mimetype },
      (error, value) => {
        acceptedError = error;
        acceptedValue = value;
      }
    );

    assert.equal(acceptedError, null);
    assert.equal(acceptedValue, true);
  }

  let rejectedError = null;

  filter(
    {},
    { originalname: "proof.exe", mimetype: "application/octet-stream" },
    (error) => {
      rejectedError = error;
    }
  );

  assert.ok(rejectedError);
});
