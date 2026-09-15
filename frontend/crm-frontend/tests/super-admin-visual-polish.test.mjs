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

test('sidebar removes back and platform access controls', () => {
  assert.doesNotMatch(html, /super-admin-compact-back/);
  assert.doesNotMatch(html, /super-admin-access-pill/);
  assert.doesNotMatch(html, />Back</);
});

test('sidebar polish defines executive visual treatment', () => {
  assert.match(scss, /SUPER ADMIN VISUAL POLISH/);
  assert.match(scss, /\.super-admin-executive-identity/);
});

test('desktop sidebar stays fixed while main content scrolls', () => {
  assert.match(scss, /\.super-admin-executive-shell \.platform-menu[\s\S]*position:\s*fixed/);
  assert.match(scss, /\.super-admin-executive-shell \.platform-menu[\s\S]*height:\s*100dvh/);
  assert.match(scss, /\.super-admin-executive-shell \.platform-main[\s\S]*margin-left:\s*264px/);
});

test('sidebar navigation owns its vertical scrolling', () => {
  assert.match(scss, /\.super-admin-executive-shell \.platform-nav[\s\S]*overflow-y:\s*auto/);
});

test('overview cards use tighter premium spacing', () => {
  assert.match(scss, /\.executive-metric-card/);
  assert.match(scss, /min-height:\s*130px/);
});

test('desktop sidebar remains visually compact', () => {
  assert.match(scss, /width:\s*264px/);
});

test('executive sidebar dark theme wins over legacy light override', () => {
  assert.match(scss, /\.super-admin-executive-shell \.platform-menu[\s\S]*background:\s*#0b1220\s*!important/);
});

test('recent activity fills the lower dashboard width', () => {
  assert.match(html, /<article class="panel executive-content-panel span-2 executive-recent-activity">/);
});

test('desktop overview bar lists avoid horizontal scrolling', () => {
  assert.match(scss, /\.super-admin-executive-shell \.workspace-grid \.bar-list[\s\S]*overflow-x:\s*hidden/);
  assert.match(scss, /\.super-admin-executive-shell \.compact-bars[\s\S]*overflow-x:\s*hidden/);
});

test('sidebar accordion keeps children mounted for smooth transitions', () => {
  assert.doesNotMatch(html, /@if\s*\(expandedMenuGroup\(\)\s*===\s*group\.title\)\s*\{/);
  assert.match(html, /\[class\.expanded\]="expandedMenuGroup\(\) === group\.title"/);
});

test('sidebar accordion animates open and closed state', () => {
  assert.match(scss, /\.super-admin-menu-children[\s\S]*max-height:/);
  assert.match(scss, /\.super-admin-menu-children[\s\S]*transition:/);
  assert.match(scss, /\.super-admin-menu-children\.expanded[\s\S]*max-height:/);
});

test('collapsed sidebar groups cannot receive interaction', () => {
  assert.match(scss, /\.super-admin-menu-children[\s\S]*pointer-events:\s*none/);
  assert.match(scss, /\.super-admin-menu-children\.expanded[\s\S]*pointer-events:\s*auto/);
});

test('overview workspace owns an explicit desktop grid', () => {
  assert.match(html, /class="workspace-grid executive-overview-workspace"/);
  assert.match(scss, /\.super-admin-executive-shell \.executive-overview-workspace[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test('overview wide panels span the complete explicit grid', () => {
  assert.match(scss, /\.super-admin-executive-shell \.executive-overview-workspace > \.span-2[\s\S]*grid-column:\s*1\s*\/\s*-1/);
});

test('Super Admin bar lists override project wide horizontal carousel rules', () => {
  assert.match(scss, /\.super-admin-executive-shell \.executive-overview-workspace \.bar-list[\s\S]*display:\s*grid\s*!important/);
  assert.match(scss, /\.super-admin-executive-shell \.executive-overview-workspace \.bar-list[\s\S]*overflow-x:\s*hidden\s*!important/);
  assert.match(scss, /\.super-admin-executive-shell \.executive-overview-workspace \.bar-list > \*[\s\S]*flex:\s*initial\s*!important/);
})

test('executive navbar stays fixed above scrolling content', () => {
  assert.match(scss, /\.super-admin-executive-shell \.super-admin-shared-navbar[\s\S]*position:\s*fixed\s*!important/);
  assert.match(scss, /\.super-admin-executive-shell \.super-admin-shared-navbar[\s\S]*left:\s*264px/);
  assert.match(scss, /\.super-admin-executive-shell \.platform-main[\s\S]*padding-top:\s*100px\s*!important/);
});

test('fixed executive navbar uses balanced premium dimensions', () => {
  assert.match(scss, /\.super-admin-executive-shell \.super-admin-shared-navbar[\s\S]*min-height:\s*76px/);
  assert.match(scss, /\.super-admin-executive-shell \.super-admin-shared-navbar[\s\S]*margin:\s*0\s*!important/);
  assert.match(scss, /\.super-admin-executive-shell \.super-admin-shared-navbar[\s\S]*padding:\s*0\s+24px\s*!important/);
});

test('fixed executive navbar vertically centers identity and actions', () => {
  assert.match(scss, /\.super-admin-executive-shell \.super-admin-navbar-main[\s\S]*min-height:\s*76px/);
  assert.match(scss, /\.super-admin-executive-shell \.super-admin-navbar-main[\s\S]*align-items:\s*center/);
  assert.match(scss, /\.super-admin-executive-shell \.super-admin-navbar-actions[\s\S]*gap:\s*12px/);
});

test('fixed executive navbar gives main content the correct desktop offset', () => {
  assert.match(scss, /\.super-admin-executive-shell \.platform-main[\s\S]*padding-top:\s*100px\s*!important/);
});
