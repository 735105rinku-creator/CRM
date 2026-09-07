import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test(
  "accounting router mounts Account Party routes at accounting root",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../routes/accounting.routes.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /import\s+accountPartyRoutes[\s\S]*?from\s+["']\.\/accountParty\.routes\.js["']/
    );

    assert.match(
      source,
      /router\.use\(\s*accountPartyRoutes\s*\)/
    );

    assert.doesNotMatch(
      source,
      /["']\/customers-vendors["']/
    );
  }
);
