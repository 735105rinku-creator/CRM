import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  access,
  rm
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  safeRemoveUploadedAccountsProofFiles
} from "../utils/accountsProofFile.util.js";


async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}


test(
  "cleans newly uploaded Multer Accounts proof files",
  async () => {

    const tempRoot =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "accounts-proof-upload-fail-"
        )
      );

    const uploadRoot =
      path.join(
        tempRoot,
        "public",
        "uploads"
      );

    const accountsDir =
      path.join(
        uploadRoot,
        "accounts-proofs"
      );

    await mkdir(
      accountsDir,
      {
        recursive: true
      }
    );

    const first =
      path.join(
        accountsDir,
        "first.pdf"
      );

    const second =
      path.join(
        accountsDir,
        "second.jpg"
      );

    await writeFile(first, "one");
    await writeFile(second, "two");

    await safeRemoveUploadedAccountsProofFiles(
      [
        { filename: "first.pdf" },
        { filename: "second.jpg" },
      ],
      {
        uploadRoot
      }
    );

    assert.equal(
      await exists(first),
      false
    );

    assert.equal(
      await exists(second),
      false
    );

    await rm(
      tempRoot,
      {
        recursive: true,
        force: true
      }
    );
  }
);


test(
  "Voucher upload failure path cleans newly uploaded files",
  () => {

    const source =
      readFileSync(
        "./src/services/voucher.service.js",
        "utf8"
      );

    const start =
      source.indexOf(
        "async addAttachments({"
      );

    const end =
      source.indexOf(
        "REMOVE VOUCHER ATTACHMENT",
        start
      );

    const section =
      source.slice(
        start,
        end
      );

    assert.match(
      section,
      /safeRemoveUploadedAccountsProofFiles\s*\(\s*files\s*\)/
    );

    assert.match(
      section,
      /catch\s*\(\s*error\s*\)/
    );
  }
);


test(
  "Expense upload failure path cleans newly uploaded files",
  () => {

    const source =
      readFileSync(
        "./src/routes/accounting.routes.js",
        "utf8"
      );

    const start =
      source.indexOf(
        "const uploadExpenseAttachments"
      );

    const end =
      source.indexOf(
        "const removeExpenseAttachment",
        start
      );

    const section =
      source.slice(
        start,
        end
      );

    assert.match(
      section,
      /safeRemoveUploadedAccountsProofFiles\s*\(\s*files\s*\)/
    );

    assert.match(
      section,
      /catch\s*\(\s*error\s*\)/
    );
  }
);
