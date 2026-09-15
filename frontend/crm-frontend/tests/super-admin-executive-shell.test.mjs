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

test('Super Admin exposes the Executive Control Center shell', () => {
  assert.match(html, /super-admin-executive-shell/);
  assert.match(html, /super-admin-shared-navbar/);
});

test('shared navbar exposes workspace and current section identity', () => {
  assert.match(html, /SUPER ADMIN/i);
  assert.match(html, /sectionTitle\(\)/);
});

test('shared navbar keeps notification refresh and Super Admin identity actions', () => {
  assert.match(html, /toggleNotificationPanel\(\)/);
  assert.match(html, /\(click\)="refresh\(\)"/);
  assert.match(html, /userName\(\)/);
});

test('old duplicate platform hero is removed from the permanent shell', () => {
  assert.doesNotMatch(html, /class="hero-row platform-hero"/);
});

test('shell does not expose duplicate permanent Back controls', () => {
  const permanentBackButtons =
    html.match(/class="[^"]*(?:back-btn|super-header-back)[^"]*"/g) ?? [];

  assert.ok(permanentBackButtons.length <= 1);
});
