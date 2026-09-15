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

test('sidebar exposes a compact executive identity header', () => {
  assert.match(html, /super-admin-executive-identity/);
  assert.match(html, /super-admin-executive-title/);
  assert.match(html, /super-admin-executive-subtitle/);
});

test('back action is presented as a compact executive control', () => {
  assert.match(html, /super-admin-compact-back/);
});

test('legacy loose platform heading is removed from sidebar shell', () => {
  assert.doesNotMatch(html, /<span>PLATFORM<\/span>/);
});

test('sidebar polish defines stronger dark executive treatment', () => {
  assert.match(scss, /SUPER ADMIN VISUAL POLISH/);
  assert.match(scss, /\.super-admin-executive-identity/);
  assert.match(scss, /\.super-admin-compact-back/);
});

test('overview cards use tighter premium spacing', () => {
  assert.match(scss, /\.executive-metric-card/);
  assert.match(scss, /min-height:\s*130px/);
});

test('desktop sidebar remains visually compact', () => {
  assert.match(scss, /grid-template-columns:\s*264px\s+minmax\(0,\s*1fr\)/);
});
