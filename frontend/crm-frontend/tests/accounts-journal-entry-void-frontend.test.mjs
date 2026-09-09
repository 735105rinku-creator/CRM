import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const componentPath =
  "src/app/features/accounts/pages/journal-entries/journal-entries.component.ts";

const templatePath =
  "src/app/features/accounts/pages/journal-entries/journal-entries.component.html";

const servicePath =
  "src/app/features/accounts/services/journal-entry.service.ts";

const component =
  fs.readFileSync(componentPath, "utf8");

const template =
  fs.readFileSync(templatePath, "utf8");

const service =
  fs.readFileSync(servicePath, "utf8");


test(
  "posted journal entry exposes Void action",
  () => {
    assert.match(
      template,
      /journal\.status\s*===\s*['"]posted['"]/
    );

    assert.match(
      template,
      /\(click\)\s*=\s*["']voidJournal\(journal\)["']/
    );

    assert.match(
      template,
      />\s*Void\s*</
    );
  }
);


test(
  "component provides journal void handler",
  () => {
    assert.match(
      component,
      /voidJournal\s*\(\s*journal\s*:\s*JournalEntry\s*\)/
    );

    assert.match(
      component,
      /journalEntryService\s*\.\s*void\s*\(/
    );

    assert.match(
      component,
      /voidReason/
    );
  }
);


test(
  "journal service exposes void endpoint",
  () => {
    assert.match(
      service,
      /void\s*\(/
    );

    assert.match(
      service,
      /\/void/
    );

    assert.match(
      service,
      /this\.api\.post<JournalEntry>/
    );
  }
);


test(
  "void workflow requests a reason",
  () => {
    assert.match(
      component,
      /Void reason|void reason|Reason for voiding|reason/i
    );
  }
);