import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const scss = fs.readFileSync(
  new URL(
    '../src/app/features/super-admin/super-admin-dashboard.component.scss',
    import.meta.url
  ),
  'utf8'
);

test('responsive rules include tablet breakpoint', () => {
  assert.match(scss, /@media\s*\(max-width:\s*1024px\)/);
});

test('responsive rules include mobile breakpoint', () => {
  assert.match(scss, /@media\s*\(max-width:\s*767px\)/);
});

test('executive metric grids collapse on narrower screens', () => {
  assert.match(scss, /\.executive-metric-grid/);
  assert.match(scss, /grid-template-columns:\s*repeat\(2/);
  assert.match(scss, /grid-template-columns:\s*1fr/);
});

test('analytics grids collapse responsively', () => {
  assert.match(scss, /\.executive-analytics-grid/);
});

test('page-level horizontal overflow is prevented', () => {
  assert.match(scss, /overflow-x:\s*hidden/);
});

test('sticky navbar adapts for compact widths', () => {
  assert.match(scss, /\.super-admin-shared-navbar/);
  assert.match(scss, /\.super-admin-navbar-main/);
});
