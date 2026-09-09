import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";


test(
  "accounting router mounts Cash/Bank Book",
  async () => {

    const source =
      await fs.readFile(
        new URL(
          "../routes/accounting.routes.js",
          import.meta.url
        ),
        "utf8"
      );


    assert.match(
      source,
      /cashBankBookRoutes/
    );


    assert.match(
      source,
      /["']\/cash-bank-book["']/
    );

  }
);
