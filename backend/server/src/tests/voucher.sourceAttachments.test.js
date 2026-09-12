import assert from "node:assert/strict";
import { test } from "node:test";

import {
  VoucherService
} from "../services/voucher.service.js";


const makePurchaseAttachment = () => ({
  _id: "attachment-1",
  fileName: "generated-proof.pdf",
  originalName: "vendor-invoice.pdf",
  fileUrl: "/uploads/purchase-invoices/generated-proof.pdf",
  storageKey: "",
  mimeType: "application/pdf",
  fileSize: 12345,
  uploadedBy: "user-1",
  uploadedAt: new Date("2026-09-11T10:00:00.000Z"),
});


test(
  "getVouchers exposes Purchase-owned attachments as response-only sourceAttachments",
  async () => {

    const calls = [];

    const service =
      new VoucherService({
        voucherRepository: {
          async list() {
            return [
              {
                _id: "voucher-1",
                voucherType: "purchase",
                sourceModule: "purchase_invoice",
                sourceReferenceId: "invoice-1",
                attachments: [],
              },
            ];
          },
        },
      });

    service.purchaseInvoiceRepository = {
      async findById(companyId, invoiceId) {

        calls.push({
          companyId,
          invoiceId,
        });

        return {
          _id: invoiceId,
          attachments: [
            makePurchaseAttachment(),
          ],
        };
      },
    };

    const rows =
      await service.getVouchers({
        companyId: "company-1",
      });

    assert.equal(
      calls.length,
      1
    );

    assert.deepEqual(
      calls[0],
      {
        companyId: "company-1",
        invoiceId: "invoice-1",
      }
    );

    assert.equal(
      rows.length,
      1
    );

    assert.equal(
      rows[0].sourceAttachments.length,
      1
    );

    assert.equal(
      rows[0].sourceAttachments[0].originalName,
      "vendor-invoice.pdf"
    );

    assert.equal(
      rows[0].sourceAttachments[0].fileUrl,
      "/uploads/purchase-invoices/generated-proof.pdf"
    );
  }
);


test(
  "getVoucherById exposes Purchase source attachments",
  async () => {

    const service =
      new VoucherService({
        voucherRepository: {
          async findById() {
            return {
              _id: "voucher-1",
              voucherType: "purchase",
              sourceModule: "purchase_invoice",
              sourceReferenceId: "invoice-1",
              attachments: [],
            };
          },
        },
      });

    service.purchaseInvoiceRepository = {
      async findById(
        companyId,
        invoiceId
      ) {
        assert.equal(
          companyId,
          "company-1"
        );

        assert.equal(
          invoiceId,
          "invoice-1"
        );

        return {
          attachments: [
            makePurchaseAttachment(),
          ],
        };
      },
    };

    const row =
      await service.getVoucherById({
        companyId: "company-1",
        voucherId: "voucher-1",
      });

    assert.equal(
      row.sourceAttachments.length,
      1
    );
  }
);


test(
  "manual Accounts vouchers do not query Purchase invoices",
  async () => {

    let purchaseLookupCount = 0;

    const service =
      new VoucherService({
        voucherRepository: {
          async list() {
            return [
              {
                _id: "voucher-2",
                voucherType: "purchase",
                sourceModule: "accounts",
                sourceReferenceId: null,
                attachments: [],
              },
            ];
          },
        },
      });

    service.purchaseInvoiceRepository = {
      async findById() {
        purchaseLookupCount += 1;
        return null;
      },
    };

    const rows =
      await service.getVouchers({
        companyId: "company-1",
      });

    assert.equal(
      purchaseLookupCount,
      0
    );

    assert.deepEqual(
      rows[0].sourceAttachments,
      []
    );
  }
);
