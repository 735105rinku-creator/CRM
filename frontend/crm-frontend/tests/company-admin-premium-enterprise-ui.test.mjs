import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ts = fs.readFileSync(
  new URL('../src/app/features/company-admin/company-admin-dashboard.component.ts', import.meta.url),
  'utf8'
);

const html = fs.readFileSync(
  new URL('../src/app/features/company-admin/company-admin-dashboard.component.html', import.meta.url),
  'utf8'
);

const scss = fs.readFileSync(
  new URL('../src/app/features/company-admin/company-admin-dashboard.component.scss', import.meta.url),
  'utf8'
);

test('Company Admin exposes Midnight Executive theme preset and reset action', () => {
  assert.match(ts, /Midnight Executive/);
  assert.match(ts, /resetThemePreview/);
  assert.match(html, /Reset to OPAS BIZZ Default/);
});

test('Company Admin premium shell exposes enterprise styling hooks', () => {
  assert.match(html, /company-premium-shell/);
  assert.match(html, /company-shared-navbar/);
  assert.match(scss, /--admin-shell-bg/);
  assert.match(scss, /#0B1324/i);
  assert.match(scss, /#2563EB/i);
});

test('Company Admin premium pass removes olive Owner Command Center treatment', () => {
  assert.match(scss, /company-owner-command-center/);
  assert.match(scss, /owner-command-center/);
});
