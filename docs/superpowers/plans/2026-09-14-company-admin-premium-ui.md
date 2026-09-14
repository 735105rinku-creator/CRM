# Company Admin Premium UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Upgrade Company Admin with a one-open-at-a-time accordion sidebar and a premium Deep Navy + Electric Blue + Soft White visual system without modifying module business logic.

**Architecture:** Preserve the existing CompanyAdminDashboardComponent, menuGroups, activeSection, setSection(), embedded Accounts components, and existing permissions. Add only Company Admin sidebar state, accessible accordion markup, and Company Admin-only premium SCSS overrides.

**Tech Stack:** Angular standalone components, Angular signals, Angular template control flow, SCSS, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-14-company-admin-premium-ui-design.md`

## Global Constraints

- No database changes.
- No Sales, Logistics, Purchase, HR, or Accounts business logic changes.
- Do not widen Company Admin permissions.
- Preserve existing section IDs and loading handlers.
- Preserve embedded Accounts behavior.
- Preserve Logistics monitor-only behavior.
- Never stage `backend/server/public/uploads/accounts-proofs/`.
- Work only on `feature/company-admin-premium-ui`.
- Use TDD for behavioral changes.
- No force push, blind pull, reset, or unsafe rebase.

## Files

Modify:
- `frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.ts`
- `frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.html`
- `frontend/crm-frontend/src/app/features/company-admin/company-admin-dashboard.component.scss`

Create:
- `frontend/crm-frontend/tests/company-admin-sidebar-accordion.test.mjs`

---

# Task 1 — Accordion Sidebar Behavior

## Test First

Create `frontend/crm-frontend/tests/company-admin-sidebar-accordion.test.mjs`.

The test must verify:

- `expandedMenuGroup` signal exists.
- `toggleMenuGroup(groupTitle: string)` exists.
- `isMenuGroupExpanded(groupTitle: string)` exists.
- `menuGroupForSection(section: string)` exists.
- module headings use `.menu-group-toggle`.
- parent button exposes `aria-expanded`.
- child items render only for the expanded module.
- existing child buttons still call `setSection(item.id)`.
- active child still uses `activeSection() === item.id`.

Run targeted test first and confirm RED.

## Implementation

Add a single `expandedMenuGroup` signal storing the currently open group title.

Add helpers:

- `toggleMenuGroup(groupTitle: string): void`
- `isMenuGroupExpanded(groupTitle: string): boolean`
- `menuGroupForSection(section: string): string`

`toggleMenuGroup` must close the current group when the same group is clicked, otherwise replace it with the newly clicked group.

`menuGroupForSection` must find the parent group by searching `menuGroups`.

Inside `setSection(section: string)`, immediately after updating `activeSection`, set `expandedMenuGroup` to `menuGroupForSection(section)`.

## HTML

Replace the static group label with a real button using:

- `class="menu-group-toggle"`
- `[class.open]="isMenuGroupExpanded(group.title)"`
- `[attr.aria-expanded]="isMenuGroupExpanded(group.title)"`
- `(click)="toggleMenuGroup(group.title)"`

Render child buttons only inside:

`@if (isMenuGroupExpanded(group.title))`

Child buttons must keep:

- `class="menu-child"`
- `[class.active]="activeSection() === item.id"`
- `(click)="setSection(item.id)"`

Run targeted test again and confirm GREEN.

Then run:

- company-admin-sidebar-accordion.test.mjs
- company-admin-accounts-navigation.test.mjs
- company-admin-logistics-routing.test.mjs

Commit:

`feat(company-admin): add accordion sidebar navigation`

---

# Task 2 — Premium Sidebar Visual System

## Test First

Extend the sidebar regression test so it verifies:

- `--admin-navy: #0b1f3a`
- `--admin-blue: #2563eb`
- `--admin-canvas: #f4f7fb`
- `.menu-group-toggle`
- `.menu-child.active`

Run the targeted sidebar test and confirm RED.

## Final Company Admin Tokens

Define these final Company Admin-only variables:

- `--admin-navy: #0b1f3a`
- `--admin-navy-soft: #102a4d`
- `--admin-blue: #2563eb`
- `--admin-blue-bright: #3b82f6`
- `--admin-canvas: #f4f7fb`
- `--admin-surface: #ffffff`
- `--admin-surface-soft: #eef3f9`
- `--admin-text: #172033`
- `--admin-muted: #64748b`
- `--admin-border: rgba(148, 163, 184, 0.22)`
- `--admin-success: #15803d`
- `--admin-warning: #b45309`
- `--admin-danger: #be123c`

## Sidebar Rules

The final `.company-admin-console .company-sidebar` rule must override the older light-neumorphism `!important` rule and use a Deep Navy to Navy Soft gradient.

Do not modify:

- `.hr-sidebar`
- `.employee-sidebar`
- `.platform-menu`

The accordion parent button must use Electric Blue for open/hover emphasis.

The accordion child active state must use:

- Electric Blue background tint
- Electric Blue left border
- white text
- no red active border

Profile, menu heading, and sidebar footer text must regain white/light contrast inside the dark sidebar.

The main content canvas must use Soft White.

Run the targeted sidebar test and confirm GREEN.

Commit:

`style(company-admin): apply premium shell palette`

---

# Task 3 — Accessibility, Scrolling and Responsive Sidebar

## Test First

Extend the sidebar regression test so it verifies:

- `.company-nav` keeps `overflow-y: auto`
- `.menu-group-toggle:focus-visible` exists
- `.menu-child:focus-visible` exists
- a responsive breakpoint exists for approximately 900px

Run the targeted sidebar test and confirm RED.

## Controlled Scrolling

The Company Admin sidebar must use one predictable navigation scroll area.

Required behavior:

- `.company-sidebar` must not create a second competing scroll region
- `.company-nav` must use `min-height: 0`
- `.company-nav` must use `overflow-y: auto`
- horizontal overflow must remain hidden
- long Logistics and Accounts sections must remain usable
- sidebar footer must remain accessible

## Keyboard Focus

Add visible `:focus-visible` treatment for:

- module accordion buttons
- child navigation buttons
- sidebar footer/logout button

Use an Electric Blue focus ring with sufficient contrast.

Do not remove browser keyboard accessibility.

## Responsive Behavior

At approximately 900px and below:

- Company Admin shell must switch away from the fixed two-column desktop layout
- sidebar must stop behaving like a full-height sticky desktop rail
- main content must use reduced padding
- no content overlap
- no double-scroll trap

Do not add new JavaScript drawer state unless browser verification proves it is actually necessary.

Run targeted test and confirm GREEN.

Commit:

`fix(company-admin): improve sidebar accessibility`

---

# Task 4 — Premium Company Admin Content Surfaces

## Scope

This task styles only Company Admin-owned surfaces.

Do not structurally rewrite embedded Accounts, Logistics, Purchase, Sales, or HR feature components.

If a broad selector changes an embedded feature unexpectedly during browser verification, narrow the selector to the Company Admin-owned wrapper instead of modifying the feature itself.

## Cards and Panels

Use the approved premium visual system for Company Admin-owned:

- dashboard cards
- summary panels
- report cards
- compact overview cards
- performance cards
- export cards

Required visual behavior:

- Soft White surface
- subtle cool-grey border
- approximately 18px radius
- restrained shadow
- clear heading hierarchy
- no heavy plastic-looking neumorphism

Important cards may use a subtle Electric Blue accent.

Routine cards must stay neutral.

## Hero / Header Surface

The Company Admin hero should use:

- Soft White / very light blue surface
- subtle border
- approximately 20px radius
- restrained depth
- dark navy heading
- consistent spacing
- no excessive gradient or glow

## Buttons

Primary actions:

- Electric Blue
- white text
- visible hover state
- visible focus state
- approximately 12px radius

Secondary actions:

- light neutral surface
- clear border
- dark text

Destructive actions:

- restrained semantic red
- must not look like a primary action

Disabled actions:

- visibly disabled
- no misleading hover treatment

## Forms

Company Admin-owned inputs, selects and textareas should use:

- white background
- subtle cool-grey border
- approximately 12px radius
- dark readable text
- Electric Blue focus border
- subtle blue focus ring
- clear disabled state
- clear error state

Existing validation logic must remain unchanged.

## Tables

Company Admin-owned tables should use:

- clear header background
- dark readable header text
- consistent row spacing
- subtle separators
- restrained row hover
- consistent status pills
- responsive wrapping where safe

Do not change table business data or actions.

## Feedback States

Normalize Company Admin-owned presentation for:

- success
- warning
- error
- info
- loading
- empty states

Do not invent new business statuses.

## Verification

Run Company Admin tests after styling.

Run Angular build.

If build exposes a new style-budget regression caused by this work, reduce duplicate Company Admin override rules before accepting the task.

Commit:

`style(company-admin): refine dashboard surfaces`

---

# Task 5 — Browser Issue Audit

Verify in browser:

- Dashboard opens correctly.
- Only one sidebar module is expanded at a time.
- Opening Accounts closes Logistics.
- Opening HRM closes Accounts.
- Active child keeps its parent expanded.
- Active child remains visually obvious.
- Long Accounts and Logistics menus scroll correctly.
- sidebar footer and logout remain reachable.
- no sidebar/main overlap.
- no unwanted horizontal page scroll.
- notification controls still work.
- Company Admin profile remains readable.
- cards, forms and tables remain usable.
- no obvious broken empty/loading/error states.

Check responsive widths around:

- 1280px
- 1024px
- 768px
- 390px

For every reproducible Company Admin runtime issue:

1. record the exact issue
2. identify the Company Admin root cause
3. write a targeted failing test where practical
4. apply the smallest fix
5. rerun regression tests

Do not modify unrelated Sales, Logistics, Purchase, HR or Accounts feature code.

Commit each independent verified fix separately using:

`fix(company-admin): <specific issue>`

---

# Task 6 — Final Regression

From `frontend/crm-frontend`, run the Company Admin tests:

- `company-admin-sidebar-accordion.test.mjs`
- `company-admin-accounts-navigation.test.mjs`
- `company-admin-logistics-routing.test.mjs`

Expected: zero failures.

Run all Accounts-related frontend tests using the existing `*account*.test.mjs` suite.

Expected: zero failures.

Run:

`npm run build`

Expected: Angular build succeeds.

Known pre-existing warnings must be distinguished from new warnings introduced by this feature.

Run from repository root:

- `git diff --check`
- `git status -sb`
- `git diff --stat origin/main...HEAD`

The only unrelated untracked path allowed is:

`backend/server/public/uploads/accounts-proofs/`

---

# Task 7 — Safe Shared-Repo Integration

Before integration:

1. `git fetch origin`
2. inspect `HEAD...origin/main`
3. inspect commits added to origin/main
4. inspect changed files for overlap with Company Admin work

Never:

- force push
- blind pull
- destructive reset
- blindly rebase shared work

If origin/main has moved, stop and inspect before integration.

Use fast-forward integration only when safe.

After integration, rerun:

- Company Admin tests
- Accounts regression
- Angular build

Then fetch origin again immediately before push.

Push only when remote divergence is understood and safe.

---

# Expected Commit Sequence

1. `docs(company-admin): add premium UI design`
2. `docs(company-admin): add premium UI implementation plan`
3. `feat(company-admin): add accordion sidebar navigation`
4. `style(company-admin): apply premium shell palette`
5. `fix(company-admin): improve sidebar accessibility`
6. `style(company-admin): refine dashboard surfaces`
7. Evidence-based `fix(company-admin): ...` commits only if required

---

# Completion Criteria

Work is complete only when:

1. Sidebar uses one-open-at-a-time accordion behavior.
2. Active child automatically keeps its parent module expanded.
3. Existing Company Admin section IDs remain unchanged.
4. Deep Navy sidebar visibly replaces the conflicting light override.
5. Electric Blue is used for active and focus states.
6. Main content uses the approved Soft White visual system.
7. Company Admin-owned cards, forms, tables and buttons are consistent.
8. Long sidebar groups remain usable.
9. Desktop and responsive layouts do not overlap.
10. Embedded Accounts behavior remains intact.
11. Logistics monitor-only permissions remain intact.
12. No other department business logic is modified.
13. Company Admin tests pass.
14. Accounts regression passes.
15. Angular build passes.
16. No unrelated files are committed.
17. Shared-repo integration is verified safe.
