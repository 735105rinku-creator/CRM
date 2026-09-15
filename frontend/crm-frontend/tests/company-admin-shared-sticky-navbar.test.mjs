import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(
  new URL(
    '../src/app/features/company-admin/company-admin-dashboard.component.html',
    import.meta.url
  ),
  'utf8'
);

const scss = fs.readFileSync(
  new URL(
    '../src/app/features/company-admin/company-admin-dashboard.component.scss',
    import.meta.url
  ),
  'utf8'
);

test('Company Admin exposes one shared shell-level sticky navbar', () => {
  assert.match(
    html,
    /<header[^>]*class="[^"]*company-shared-navbar[^"]*"/
  );

  assert.match(
    scss,
    /\.company-premium-shell\s+\.company-shared-navbar[\s\S]*position:\s*sticky/
  );

  assert.match(
    scss,
    /\.company-premium-shell\s+\.company-shared-navbar[\s\S]*top:\s*0/
  );
});

test('Company Admin shared navbar exposes workspace identity and current section', () => {
  assert.match(
    html,
    /class="company-workspace-badge"[\s\S]*Company Admin/
  );

  assert.match(
    html,
    /class="company-navbar-title"[\s\S]*\{\{\s*sectionTitle\(\)\s*\}\}/
  );

  assert.match(
    html,
    /class="company-navbar-subtitle"/
  );
});

test('Company Admin shared navbar keeps global notification and user identity controls', () => {
  assert.match(
    html,
    /class="[^"]*company-navbar-actions[^"]*"[\s\S]*toggleNotificationPanel\(\)/
  );

  assert.match(
    html,
    /class="company-navbar-user"/
  );

  assert.match(
    html,
    /\{\{\s*userName\(\)\s*\}\}/
  );
});

test('Company Admin no longer uses the old page hero as the primary shell header', () => {
  assert.doesNotMatch(
    html,
    /class="hero-row company-hero company-premium-topbar"/
  );
});

test('Company Admin navbar styling includes enterprise responsive treatment', () => {
  assert.match(
    scss,
    /\.company-premium-shell\s+\.company-navbar-main/
  );

  assert.match(
    scss,
    /@media\s*\(max-width:\s*767px\)[\s\S]*company-shared-navbar/
  );
});
