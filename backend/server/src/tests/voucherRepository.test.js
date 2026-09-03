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
