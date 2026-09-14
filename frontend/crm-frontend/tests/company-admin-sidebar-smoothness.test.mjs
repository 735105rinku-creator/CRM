import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(
  new URL('../src/app/features/company-admin/company-admin-dashboard.component.html', import.meta.url),
  'utf8'
);

const scss = fs.readFileSync(
  new URL('../src/app/features/company-admin/company-admin-dashboard.component.scss', import.meta.url),
  'utf8'
);

test('Company Admin sidebar keeps submenu mounted for smooth close animation', () => {
  assert.match(
    html,
    /class="menu-group-items"[\s\S]*?\[class\.open\]="isMenuGroupExpanded\(group\.title\)"/
  );

  assert.doesNotMatch(
    html,
    /@if\s*\(isMenuGroupExpanded\(group\.title\)\)\s*\{[\s\S]{0,120}<div class="menu-group-items"/
  );
});

test('Company Admin submenu animates both opening and closing', () => {
  assert.match(scss, /\.menu-group-items\s*\{[\s\S]*?max-height:\s*0/);
  assert.match(scss, /\.menu-group-items\.open\s*\{[\s\S]*?max-height:/);
  assert.match(scss, /transition:[\s\S]*?max-height/);
});

test('Company Admin sidebar does not run legacy reveal animation alongside smooth height transition', () => {
  assert.doesNotMatch(
    scss,
    /animation:\s*adminMenuReveal/
  );

  assert.doesNotMatch(
    scss,
    /@keyframes\s+adminMenuReveal/
  );
});
