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
import { test } from "node:test";

import {
  safeRemoveAccountsProofFile
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
  "removes only files inside accounts-proofs",
  async () => {

    const tempRoot =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "accounts-proof-safe-"
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

    const target =
      path.join(
        accountsDir,
        "proof.pdf"
      );

    await writeFile(
      target,
      "proof"
    );

    await safeRemoveAccountsProofFile(
      "/uploads/accounts-proofs/proof.pdf",
      {
        uploadRoot
      }
    );

    assert.equal(
      await exists(target),
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
  "refuses traversal outside accounts-proofs",
  async () => {

    const tempRoot =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "accounts-proof-traversal-"
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

    const outside =
      path.join(
        uploadRoot,
        "outside.pdf"
      );

    await writeFile(
      outside,
      "outside"
    );

    await assert.rejects(
      () =>
        safeRemoveAccountsProofFile(
          "/uploads/accounts-proofs/../outside.pdf",
          {
            uploadRoot
          }
        ),
      /unsafe|outside|accounts-proofs/i
    );

    assert.equal(
      await exists(outside),
      true
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
  "ignores missing files safely",
  async () => {

    const tempRoot =
      await mkdtemp(
        path.join(
          os.tmpdir(),
          "accounts-proof-missing-"
        )
      );

    const uploadRoot =
      path.join(
        tempRoot,
        "public",
        "uploads"
      );

    await mkdir(
      path.join(
        uploadRoot,
        "accounts-proofs"
      ),
      {
        recursive: true
      }
    );

    await safeRemoveAccountsProofFile(
      "/uploads/accounts-proofs/missing.pdf",
      {
        uploadRoot
      }
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
