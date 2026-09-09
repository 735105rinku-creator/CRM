import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  test,
} from "node:test";


const componentPath =
  path.resolve(
    "src/app/features/accounts/pages/journal-entries/journal-entries.component.ts"
  );

const templatePath =
  path.resolve(
    "src/app/features/accounts/pages/journal-entries/journal-entries.component.html"
  );

const servicePath =
  path.resolve(
    "src/app/features/accounts/services/journal-entry.service.ts"
  );


const component =
  fs.readFileSync(
    componentPath,
    "utf8"
  );

const template =
  fs.readFileSync(
    templatePath,
    "utf8"
  );

const service =
  fs.readFileSync(
    servicePath,
    "utf8"
  );


test(
  "draft journal exposes a Post action",
  () => {

    assert.match(
      template,
      /Post/
    );

    assert.match(
      template,
      /journal\.status\s*===\s*['"]draft['"]/
    );

  }
);


test(
  "component posts a draft through JournalEntryService",
  () => {

    assert.match(
      component,
      /postJournal\s*\(/
    );

    assert.match(
      component,
      /journalEntryService[\s\S]*?\.post\s*\(/
    );

  }
);


test(
  "journal service exposes the post endpoint",
  () => {

    assert.match(
      service,
      /post\s*\(/
    );

    assert.match(
      service,
      /\/post/
    );

    assert.match(
      service,
      /this\.api\.post/
    );

  }
);