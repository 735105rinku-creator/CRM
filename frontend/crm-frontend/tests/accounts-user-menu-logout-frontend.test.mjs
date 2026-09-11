import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const read = (file) =>
  fs.readFileSync(
    path.join(root, file),
    "utf8"
  );

const shellTs = read(
  "src/app/features/accounts/layout/accounts-shell.component.ts"
);

const shellHtml = read(
  "src/app/features/accounts/layout/accounts-shell.component.html"
);

const sidebarTs = read(
  "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.ts"
);

const sidebarHtml = read(
  "src/app/features/accounts/components/accounts-sidebar/accounts-sidebar.component.html"
);


test(
  "Accounts shell exposes a persistent current-user profile menu",
  () => {
    assert.match(
      shellHtml,
      /\{\{\s*userName\(\)\s*\}\}/
    );

    assert.match(
      shellHtml,
      /\{\{\s*userDesignation\(\)\s*\}\}/
    );

    assert.match(
      shellHtml,
      /\(click\)\s*=\s*["']toggleUserMenu\(\)["']/
    );

    assert.match(
      shellHtml,
      /userMenuOpen\(\)/
    );

    assert.match(
      shellHtml,
      />\s*My Profile\s*</
    );

    assert.match(
      shellHtml,
      />\s*Settings\s*</
    );

    assert.match(
      shellHtml,
      />\s*Logout\s*</
    );
  }
);


test(
  "Accounts top user menu navigates to profile and Accounts settings",
  () => {
    assert.match(
      shellTs,
      /AuthService/
    );

    assert.match(
      shellTs,
      /Router/
    );

    assert.match(
      shellTs,
      /openProfile\s*\(\)/
    );

    assert.match(
      shellTs,
      /['"]\/accounts\/employee['"]/
    );

    assert.match(
      shellTs,
      /feature\s*:\s*['"]profile['"]/
    );

    assert.match(
      shellTs,
      /openSettings\s*\(\)/
    );

    assert.match(
      shellTs,
      /['"]\/accounts\/settings['"]/
    );
  }
);


test(
  "Accounts top user menu logs out through the shared AuthService",
  () => {
    assert.match(
      shellHtml,
      /\(click\)\s*=\s*["']logout\(\)["']/
    );

    assert.match(
      shellTs,
      /logout\s*\(\)\s*:\s*void/
    );

    assert.match(
      shellTs,
      /this\.auth\.logout\(\)/
    );
  }
);


test(
  "Accounts sidebar provides a bottom logout action",
  () => {
    assert.match(
      sidebarHtml,
      /\(click\)\s*=\s*["']logout\(\)["']/
    );

    assert.match(
      sidebarHtml,
      />\s*Logout\s*</
    );

    assert.match(
      sidebarTs,
      /AuthService/
    );

    assert.match(
      sidebarTs,
      /logout\s*\(\)\s*:\s*void/
    );

    assert.match(
      sidebarTs,
      /this\.auth\.logout\(\)/
    );
  }
);