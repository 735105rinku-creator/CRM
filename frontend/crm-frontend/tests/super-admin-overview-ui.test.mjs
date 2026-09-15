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

test('overview exposes executive metric grid and cards', () => {
  assert.match(html, /executive-metric-grid/);
  assert.match(html, /executive-metric-card/);
});

test('overview preserves all existing live KPI labels and bindings', () => {
  assert.match(html, /Total Companies/);
  assert.match(html, /stats\(\)\.companies/);
  assert.match(html, /Total Users/);
  assert.match(html, /stats\(\)\.users/);
  assert.match(html, /New Signups/);
  assert.match(html, /stats\(\)\.signups/);
  assert.match(html, /MRR \/ Total Revenue/);
  assert.match(html, /stats\(\)\.mrr/);
  assert.match(html, /Subscriptions/);
  assert.match(html, /stats\(\)\.subscriptionsActive/);
  assert.match(html, /Support Tickets/);
  assert.match(html, /stats\(\)\.ticketsOpen/);
});

test('overview keeps existing analytics sections and data loops', () => {
  assert.match(html, /Company Signup Trend/);
  assert.match(html, /signupTrend\(\)/);
  assert.match(html, /Revenue Growth/);
  assert.match(html, /revenueTrend\(\)/);
  assert.match(html, /Plan Distribution/);
  assert.match(html, /planDistribution\(\)/);
  assert.match(html, /Top Active Companies/);
  assert.match(html, /topCompanies\(\)/);
  assert.match(html, /Recent Activity/);
  assert.match(html, /recentActivity\(\)/);
});

test('analytics use premium executive presentation classes', () => {
  assert.match(html, /executive-analytics-grid/);
  assert.match(html, /executive-analytics-panel/);
});

test('overview styles include executive KPI hierarchy', () => {
  assert.match(scss, /\.executive-metric-grid/);
  assert.match(scss, /\.executive-metric-card/);
});
