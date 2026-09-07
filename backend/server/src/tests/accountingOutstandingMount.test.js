import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

test(
  "accounting routes mounts outstanding report",
  () => {

    const currentFile =
      fileURLToPath(
        import.meta.url
      );

    const currentDir =
      path.dirname(
        currentFile
      );

    const accountingRoutesPath =
      path.join(
        currentDir,
        "../routes/accounting.routes.js"
      );

    const source =
      fs.readFileSync(
        accountingRoutesPath,
        "utf8"
      );

    assert.match(
      source,
      /outstanding\.routes\.js/
    );

    assert.match(
      source,
      /["']\/outstanding["']/
    );

  }
);
