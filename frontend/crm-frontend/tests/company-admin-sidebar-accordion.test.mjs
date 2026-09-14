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
