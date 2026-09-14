import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..'
);

const adminTs = readFileSync(
  resolve(
    frontendRoot,
    'src/app/features/company-admin/company-admin-dashboard.component.ts'
  ),
  'utf8'
);

const adminHtml = readFileSync(
  resolve(
    frontendRoot,
    'src/app/features/company-admin/company-admin-dashboard.component.html'
  ),
  'utf8'
);
const adminScss = readFileSync(
  resolve(
    frontendRoot,
    'src/app/features/company-admin/company-admin-dashboard.component.scss'
  ),
  'utf8'
);

test(
  'Company Admin sidebar exposes single-open accordion state',
  () => {
    assert.match(
      adminTs,
      /expandedMenuGroup\s*=\s*signal<\s*string\s*\|\s*null\s*>/
    );

    assert.match(
      adminTs,
      /toggleMenuGroup\s*\(\s*groupTitle:\s*string\s*\)\s*:\s*void/
    );

    assert.match(
      adminTs,
      /isMenuGroupExpanded\s*\(\s*groupTitle:\s*string\s*\)\s*:\s*boolean/
    );

    assert.match(
      adminTs,
      /menuGroupForSection\s*\(\s*section:\s*string\s*\)\s*:\s*string/
    );
  }
);

test(
  'Company Admin sidebar renders accessible module toggle controls',
  () => {
    assert.match(
      adminHtml,
      /class="menu-group-toggle"/
    );

    assert.match(
      adminHtml,
      /\[attr\.aria-expanded\]="isMenuGroupExpanded\(group\.title\)"/
    );

    assert.match(
      adminHtml,
      /\(click\)="toggleMenuGroup\(group\.title\)"/
    );

    assert.match(
      adminHtml,
      /@if\s*\(\s*isMenuGroupExpanded\(group\.title\)\s*\)/
    );
  }
);

test(
  'Selecting a child keeps its owning module expanded',
  () => {
    assert.match(
      adminTs,
      /this\.expandedMenuGroup\.set\(\s*this\.menuGroupForSection\(\s*section\s*\)\s*\)/
    );

    assert.match(
      adminHtml,
      /\[class\.active\]="activeSection\(\) === item\.id"/
    );

    assert.match(
      adminHtml,
      /\(click\)="setSection\(item\.id\)"/
    );
  }
);

test(
  'Company Admin premium shell defines the approved visual tokens',
  () => {
    assert.match(
      adminScss,
      /--admin-navy:\s*#0b1f3a/i
    );

    assert.match(
      adminScss,
      /--admin-blue:\s*#2563eb/i
    );

    assert.match(
      adminScss,
      /--admin-canvas:\s*#f4f7fb/i
    );

    assert.match(
      adminScss,
      /\.company-admin-console[\s\S]*?\.company-sidebar[\s\S]*?var\(--admin-navy\)/
    );

    assert.match(
      adminScss,
      /\.menu-group-toggle/
    );

    assert.match(
      adminScss,
      /\.menu-child\.active/
    );
  }
);

test(
  'Company Admin sidebar supports controlled scrolling and focus visibility',
  () => {
    assert.match(
      adminScss,
      /\.company-admin-console\s+\.company-nav[\s\S]*?min-height:\s*0/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+\.company-nav[\s\S]*?overflow-y:\s*auto/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+\.menu-group-toggle:focus-visible/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+\.menu-child:focus-visible/
    );

    assert.match(
      adminScss,
      /@media\s*\(max-width:\s*900px\)/
    );
  }
);

test(
  'Company Admin premium content surfaces use scoped neumorphic treatment',
  () => {
    assert.match(
      adminScss,
      /\.company-admin-console\s+\.company-hero[\s\S]*?background:\s*var\(--admin-surface\)/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+\.company-stats\s+article[\s\S]*?box-shadow:/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+\.panel[\s\S]*?background:\s*var\(--admin-surface\)/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+input[\s\S]*?border-radius:/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+table[\s\S]*?background:\s*var\(--admin-surface\)/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+\.notice[\s\S]*?border-radius:/
    );

    assert.match(
      adminScss,
      /\.company-admin-console\s+\.primary-action[\s\S]*?var\(--admin-blue\)/
    );
  }
);
