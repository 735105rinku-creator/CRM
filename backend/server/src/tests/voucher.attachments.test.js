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

test("Voucher router exposes draft attachment upload and attachment delete routes", async () => {
  const { default: router } = await import("../routes/voucher.routes.js");

  const routes = (router.stack || [])
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods || {}),
    }));

  const uploadRoute = routes.find(
    (route) =>
      route.path === "/:voucherId/attachments" &&
      route.methods.includes("post")
  );

  const deleteRoute = routes.find(
    (route) =>
      route.path === "/:voucherId/attachments/:attachmentId" &&
      route.methods.includes("delete")
  );

  assert.ok(
    uploadRoute,
    "POST /:voucherId/attachments must exist"
  );

  assert.ok(
    deleteRoute,
    "DELETE /:voucherId/attachments/:attachmentId must exist"
  );
});

test("Voucher router still does not expose physical Voucher DELETE", async () => {
  const { default: router } = await import("../routes/voucher.routes.js");

  const hasPhysicalVoucherDelete = (router.stack || []).some(
    (layer) =>
      layer.route?.path === "/:voucherId" &&
      Boolean(layer.route?.methods?.delete)
  );

  assert.equal(hasPhysicalVoucherDelete, false);
});

test("Voucher repository exposes draft attachment mutation methods", async () => {
  const { default: repository } = await import("../repositories/voucher.repository.js");

  assert.equal(typeof repository.appendAttachments, "function");
  assert.equal(typeof repository.removeAttachment, "function");
});

test("Voucher service exposes attachment lifecycle methods", async () => {
  const { VoucherService } = await import("../services/voucher.service.js");

  const service = new VoucherService({
    voucherRepository: {},
    journalService: {},
    chartRepository: {},
    sessionProvider: {},
  });

  assert.equal(typeof service.addAttachments, "function");
  assert.equal(typeof service.removeAttachment, "function");
});

test("Voucher attachment upload rejects more than five total attachments", async () => {
  const { VoucherService } = await import("../services/voucher.service.js");

  let appendCalled = false;

  const service = new VoucherService({
    voucherRepository: {
      findById: async () => ({
        _id: "voucher-1",
        status: "draft",
        attachments: [
          { _id: "a1" },
          { _id: "a2" },
          { _id: "a3" },
          { _id: "a4" },
        ],
      }),
      appendAttachments: async () => {
        appendCalled = true;
        return {};
      },
    },
    journalService: {},
    chartRepository: {},
    sessionProvider: {},
  });

  await assert.rejects(
    () =>
      service.addAttachments({
        companyId: "company-1",
        voucherId: "voucher-1",
        userId: "user-1",
        files: [
          {
            originalname: "one.pdf",
            filename: "one-generated.pdf",
            mimetype: "application/pdf",
            size: 100,
          },
          {
            originalname: "two.pdf",
            filename: "two-generated.pdf",
            mimetype: "application/pdf",
            size: 100,
          },
        ],
      }),
    /maximum of 5|maximum 5|max 5/i
  );

  assert.equal(appendCalled, false);
});

test("Voucher attachment upload is draft-only and company-scoped through findById", async () => {
  const { VoucherService } = await import("../services/voucher.service.js");

  let receivedFindArgs = null;
  let appendCalled = false;

  const service = new VoucherService({
    voucherRepository: {
      findById: async (args) => {
        receivedFindArgs = args;
        return {
          _id: "voucher-1",
          status: "posted",
          attachments: [],
        };
      },
      appendAttachments: async () => {
        appendCalled = true;
        return {};
      },
    },
    journalService: {},
    chartRepository: {},
    sessionProvider: {},
  });

  await assert.rejects(
    () =>
      service.addAttachments({
        companyId: "company-1",
        voucherId: "voucher-1",
        userId: "user-1",
        files: [
          {
            originalname: "proof.pdf",
            filename: "generated.pdf",
            mimetype: "application/pdf",
            size: 100,
          },
        ],
      }),
    /draft/i
  );

  assert.deepEqual(receivedFindArgs, {
    companyId: "company-1",
    voucherId: "voucher-1",
  });

  assert.equal(appendCalled, false);
});

test("Voucher attachment removal rejects posted vouchers", async () => {
  const { VoucherService } = await import("../services/voucher.service.js");

  let removeCalled = false;

  const service = new VoucherService({
    voucherRepository: {
      findById: async () => ({
        _id: "voucher-1",
        status: "posted",
        attachments: [
          { _id: "attachment-1" },
        ],
      }),
      removeAttachment: async () => {
        removeCalled = true;
        return {};
      },
    },
    journalService: {},
    chartRepository: {},
    sessionProvider: {},
  });

  await assert.rejects(
    () =>
      service.removeAttachment({
        companyId: "company-1",
        voucherId: "voucher-1",
        attachmentId: "attachment-1",
        userId: "user-1",
      }),
    /draft/i
  );

  assert.equal(removeCalled, false);
});

const makePostingService = async ({ voucher, purchaseInvoice = null } = {}) => {
  const { VoucherService } = await import("../services/voucher.service.js");

  let journalCreateCalled = false;
  let purchaseInvoiceLookup = null;

  const voucherRepository = {
    async findById() {
      return voucher;
    },

    async postById({ voucherId, journalEntryId }) {
      return {
        ...voucher,
        _id: voucherId,
        status: "posted",
        journalEntryId,
      };
    },
  };

  const journalService = {
    async createJournal() {
      journalCreateCalled = true;
      return {
        _id: "journal-1",
        status: "draft",
      };
    },

    async postJournal({ journalEntryId }) {
      return {
        _id: journalEntryId,
        status: "posted",
      };
    },
  };

  const purchaseInvoiceRepository = {
    async findById(companyId, invoiceId) {
      purchaseInvoiceLookup = {
        companyId,
        invoiceId,
      };

      return purchaseInvoice;
    },
  };

  const sessionProvider = {
    async startSession() {
      return {
        async withTransaction(callback) {
          return callback();
        },

        async endSession() {},
      };
    },
  };

  const service = new VoucherService({
    voucherRepository,
    journalService,
    chartRepository: {},
    purchaseInvoiceRepository,
    sessionProvider,
  });

  service.validatePaymentVoucher = async () => {};
  service.validatePurchaseVoucher = async () => {};

  return {
    service,
    journalCreateCalled: () => journalCreateCalled,
    purchaseInvoiceLookup: () => purchaseInvoiceLookup,
  };
};

test("Payment Voucher cannot be posted without Accounts proof", async () => {
  const harness = await makePostingService({
    voucher: {
      _id: "payment-1",
      voucherNumber: "PV/2026-27/000001",
      voucherType: "payment",
      voucherDate: "2026-09-11",
      narration: "Supplier payment",
      status: "draft",
      attachments: [],
      sourceModule: "accounts",
      sourceReferenceId: null,
      lines: [
        { accountId: "payable-1", debit: 100, credit: 0 },
        { accountId: "bank-1", debit: 0, credit: 100 },
      ],
    },
  });

  await assert.rejects(
    () =>
      harness.service.postVoucher({
        companyId: "company-1",
        voucherId: "payment-1",
        userId: "user-1",
      }),
    /proof|attachment|supporting document/i
  );

  assert.equal(harness.journalCreateCalled(), false);
});

test("Manual Purchase Voucher cannot be posted without Accounts proof", async () => {
  const harness = await makePostingService({
    voucher: {
      _id: "purchase-1",
      voucherNumber: "PU/2026-27/000001",
      voucherType: "purchase",
      voucherDate: "2026-09-11",
      narration: "Manual purchase bill",
      status: "draft",
      attachments: [],
      sourceModule: "accounts",
      sourceReferenceId: null,
      lines: [
        { accountId: "purchase-ledger", debit: 100, credit: 0 },
        { accountId: "payable-1", debit: 0, credit: 100 },
      ],
    },
  });

  await assert.rejects(
    () =>
      harness.service.postVoucher({
        companyId: "company-1",
        voucherId: "purchase-1",
        userId: "user-1",
      }),
    /proof|attachment|supporting document/i
  );

  assert.equal(harness.journalCreateCalled(), false);
});

test("Purchase-origin Purchase Voucher reuses Purchase Invoice proof without duplicate Accounts upload", async () => {
  const sourceReferenceId = "64f000000000000000000123";

  const harness = await makePostingService({
    voucher: {
      _id: "purchase-source-1",
      voucherNumber: "PU/2026-27/000002",
      voucherType: "purchase",
      voucherDate: "2026-09-11",
      narration: "Purchase invoice handoff",
      status: "draft",
      attachments: [],
      sourceModule: "purchase_invoice",
      sourceReferenceId,
      lines: [
        { accountId: "purchase-ledger", debit: 100, credit: 0 },
        { accountId: "payable-1", debit: 0, credit: 100 },
      ],
    },
    purchaseInvoice: {
      _id: sourceReferenceId,
      companyId: "company-1",
      attachments: [
        {
          _id: "purchase-proof-1",
          originalName: "vendor-invoice.pdf",
          fileUrl: "/uploads/purchase-invoices/vendor-invoice.pdf",
          mimeType: "application/pdf",
          fileSize: 1000,
        },
      ],
    },
  });

  const result = await harness.service.postVoucher({
    companyId: "company-1",
    voucherId: "purchase-source-1",
    userId: "user-1",
  });

  assert.equal(result.status, "posted");

  assert.deepEqual(
    harness.purchaseInvoiceLookup(),
    {
      companyId: "company-1",
      invoiceId: sourceReferenceId,
    }
  );
});
