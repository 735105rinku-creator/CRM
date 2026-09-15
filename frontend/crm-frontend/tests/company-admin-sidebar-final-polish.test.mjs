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

test('Company Admin sidebar uses SVG chevron instead of broken encoded character', () => {
  assert.doesNotMatch(
    html,
    /â€º|›/
  );

  assert.match(
    html,
    /class="menu-group-chevron-icon"/
  );
});

test('Company Admin sidebar has premium compact scrollbar treatment', () => {
  assert.match(
    scss,
    /scrollbar-width:\s*thin/
  );

  assert.match(
    scss,
    /::-webkit-scrollbar/
  );

  assert.match(
    scss,
    /::-webkit-scrollbar-thumb/
  );
});

test('Company Admin module chevron rotates smoothly when open', () => {
  assert.match(
    scss,
    /\.menu-group-chevron-icon[\s\S]*transition:[^;]*transform/
  );

  assert.match(
    scss,
    /\.menu-group-toggle\.open[\s\S]*\.menu-group-chevron-icon[\s\S]*transform:\s*rotate\(90deg\)/
  );
});
