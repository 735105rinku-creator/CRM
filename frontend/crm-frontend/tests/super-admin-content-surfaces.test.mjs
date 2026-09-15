import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(
  new URL(
    '../src/app/features/super-admin/super-admin-dashboard.component.html',
    import.meta.url
  ),
  'utf8'
);

const scss = fs.readFileSync(
  new URL(
    '../src/app/features/super-admin/super-admin-dashboard.component.scss',
    import.meta.url
  ),
  'utf8'
);

test('content workspaces expose enterprise surface hooks', () => {
  assert.match(html, /executive-content-panel/);
  assert.match(html, /executive-filter-row/);
  assert.match(html, /executive-table-wrap/);
});

test('existing business section ids and actions remain present', () => {
  assert.match(html, /activeSection\(\) === 'companies'/);
  assert.match(html, /activeSection\(\) === 'users'/);
  assert.match(html, /activeSection\(\) === 'plans'/);
  assert.match(html, /activeSection\(\) === 'revenue-report'/);
  assert.match(html, /setSection\('add-company'\)/);
});

test('enterprise controls use consistent input sizing', () => {
  assert.match(scss, /executive-control/);
  assert.match(scss, /min-height:\s*(44|45|46)px/);
});

test('tables are contained with horizontal overflow protection', () => {
  assert.match(scss, /\.executive-table-wrap/);
  assert.match(scss, /overflow-x:\s*auto/);
});

test('enterprise content panels keep clean border and radius treatment', () => {
  assert.match(scss, /\.executive-content-panel/);
  assert.match(scss, /border-radius:\s*14px/);
});
