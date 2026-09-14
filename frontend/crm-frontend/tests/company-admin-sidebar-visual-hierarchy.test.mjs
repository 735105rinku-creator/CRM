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

const ts = fs.readFileSync(
  new URL(
    '../src/app/features/company-admin/company-admin-dashboard.component.ts',
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

test('Company Admin sidebar renders meaningful parent and child icons', () => {
  assert.match(
    html,
    /class="menu-group-icon"/
  );

  assert.match(
    html,
    /class="menu-child-icon"/
  );

  assert.match(
    html,
    /\[attr\.d\]="menuGroupIconPath\(group\.title\)"/
  );

  assert.match(
    html,
    /\[attr\.d\]="menuItemIconPath\(item\.id\)"/
  );

  assert.match(
    ts,
    /menuGroupIconPath\s*\(/
  );

  assert.match(
    ts,
    /menuItemIconPath\s*\(/
  );
});

test('Company Admin sidebar exposes clear parent-child visual hierarchy', () => {
  assert.match(
    html,
    /class="menu-child-label"/
  );

  assert.match(
    scss,
    /\.company-premium-shell\s+\.menu-group-title[\s\S]*font-size:\s*13\.5px/
  );

  assert.match(
    scss,
    /\.company-premium-shell\s+\.menu-child-label[\s\S]*font-size:\s*12px/
  );

  assert.match(
    scss,
    /\.company-premium-shell\s+\.menu-child-label[\s\S]*font-weight:\s*5[0-9]{2}/
  );
});

test('Company Admin sidebar uses a professional enterprise font stack', () => {
  assert.match(
    scss,
    /\.company-premium-shell\s+\.company-sidebar[\s\S]*font-family:[^;]*(Segoe UI|Inter|system-ui)/
  );
});

test('Company Admin sidebar icon sizing distinguishes modules from children', () => {
  assert.match(
    scss,
    /\.company-premium-shell\s+\.menu-group-icon[\s\S]*width:\s*18px/
  );

  assert.match(
    scss,
    /\.company-premium-shell\s+\.menu-child-icon[\s\S]*width:\s*14px/
  );
});
