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

test('executive sidebar exposes grouped navigation hierarchy', () => {
  assert.match(html, /super-admin-menu-group/);
  assert.match(html, /super-admin-menu-parent/);
  assert.match(html, /super-admin-menu-child/);
});

test('sidebar uses accessible accordion controls', () => {
  assert.match(html, /aria-expanded/);
});

test('sidebar uses inline svg icons instead of an icon dependency', () => {
  assert.match(html, /<svg[\s>]/);
});

test('active child state remains driven by activeSection', () => {
  assert.match(html, /activeSection\(\) === item\.id/);
});

test('sidebar includes compact scrollbar styling', () => {
  assert.match(scss, /::-webkit-scrollbar/);
});
