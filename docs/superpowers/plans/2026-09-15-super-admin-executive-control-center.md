# Super Admin Executive Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the existing OPAS BIZZ CRM Super Admin frontend into a premium Executive Control Center without changing existing backend APIs, routing, permissions, data flow, or business behavior.

**Architecture:** Preserve the existing `SuperAdminDashboardComponent` and section-driven behavior. Refine the shell in place with scoped HTML/SCSS and only presentation-only TypeScript state where required. Add static Node regression tests for shell structure, sidebar hierarchy, overview, content surfaces, and responsive behavior.

**Tech Stack:** Angular standalone frontend, TypeScript, Angular signals/computed state, HTML control flow, SCSS, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-15-super-admin-executive-control-center-design.md`

## Global Constraints

- Frontend Super Admin UI enhancement only.
- No backend API changes.
- No database changes, migrations, seeds, resets or deletes.
- No permission or authorization changes.
- No Super Admin business-rule changes.
- Do not redesign Company Admin, Accounts, Sales, Logistics, Purchase or HR.
- No third-party icon library.
- Preserve existing Super Admin section IDs, handlers, notification behavior, billing, company, user, support and report flows.
- No full-page horizontal scrollbar.
- Do not stage or modify runtime uploads.
- Use an isolated feature branch/worktree for implementation.
- Follow RED -> GREEN -> REFACTOR.
- Run `git diff --check` before commits.
- Do not fix unrelated Angular warnings/errors in other modules.

---

## File Structure

Primary implementation:
- `frontend/crm-frontend/src/app/features/super-admin/super-admin-dashboard.component.html`
- `frontend/crm-frontend/src/app/features/super-admin/super-admin-dashboard.component.scss`
- `frontend/crm-frontend/src/app/features/super-admin/super-admin-dashboard.component.ts`

New tests:
- `frontend/crm-frontend/tests/super-admin-executive-shell.test.mjs`
- `frontend/crm-frontend/tests/super-admin-sidebar-navigation.test.mjs`
- `frontend/crm-frontend/tests/super-admin-overview-ui.test.mjs`
- `frontend/crm-frontend/tests/super-admin-content-surfaces.test.mjs`
- `frontend/crm-frontend/tests/super-admin-responsive-ui.test.mjs`

Existing tests remain authoritative.

---

### Task 1: Lock Existing Super Admin Shell Behavior

**Files:**
- Create: `frontend/crm-frontend/tests/super-admin-executive-shell.test.mjs`
- Read only: Super Admin HTML/TS

**Interfaces:**
- Consumes: `activeSection()`, `setSection()`, `sectionTitle()`, `refresh()`, `toggleNotificationPanel()`, `userName()`, `userEmail()`.
- Produces: shell regression contract.

- [ ] Write failing tests requiring `super-admin-executive-shell`, `super-admin-shared-navbar`, `sectionTitle()`, notification, refresh, user identity, no legacy `hero-row platform-hero`, and no duplicate permanent Back controls.
- [ ] Run `node --test ".\tests\super-admin-executive-shell.test.mjs"` and confirm RED.
- [ ] Run `git diff --check`.
- [ ] Commit only the failing test with `test(super-admin): define executive shell contract`.

### Task 2: Build Shared Executive Shell and Sticky Navbar

**Files:**
- Modify Super Admin HTML/SCSS
- Test with Task 1 test

**Interfaces:**
- Preserve existing notification loops/handlers and current section state.
- Produce `.super-admin-executive-shell` and `.super-admin-shared-navbar`.

- [ ] Add `super-admin-executive-shell` to outer shell.
- [ ] Consolidate old topbar + hero into one sticky navbar.
- [ ] Left: `SUPER ADMIN` badge, `sectionTitle()`, platform subtitle.
- [ ] Right: existing notifications, Refresh, Super Admin avatar/name/role.
- [ ] Remove duplicate hero identity.
- [ ] Remove redundant permanent Back controls; retain contextual Back only if a detail flow requires it.
- [ ] Add scoped executive colors and sticky navbar CSS (`position: sticky; top: 0; z-index: 900`).
- [ ] Run shell test and confirm GREEN.
- [ ] Run `git diff --check`.
- [ ] Commit with `feat(super-admin): add executive control center shell`.

### Task 3: Upgrade Sidebar Into Executive Grouped Navigation

**Files:**
- Create `super-admin-sidebar-navigation.test.mjs`
- Modify Super Admin HTML/SCSS
- Modify TS only if accordion state is required

**Interfaces:**
- Consume existing `menuGroups`, `activeSection()`, `setSection(id)`.
- Preserve every existing section ID/label.
- Optional presentation-only `expandedMenuGroup`.

- [ ] Write RED tests for `super-admin-menu-group`, `super-admin-menu-parent`, `super-admin-menu-child`, `aria-expanded`, inline SVG, active child binding, compact scrollbar.
- [ ] Run test and confirm RED.
- [ ] Reuse existing accordion state if present; otherwise add one-open-group presentation state.
- [ ] Add meaningful inline SVG parent icons and SVG chevrons.
- [ ] Add clear parent/child hierarchy and active styling.
- [ ] Run shell + sidebar tests and confirm GREEN.
- [ ] Run `git diff --check`.
- [ ] Commit with `feat(super-admin): refine executive sidebar navigation`.

### Task 4: Refine Executive Overview KPIs and Analytics

**Files:**
- Create `super-admin-overview-ui.test.mjs`
- Modify Super Admin HTML/SCSS

**Interfaces:**
- Preserve `stats()`, `signupTrend()`, `revenueTrend()`, `planDistribution()`, `topCompanies()`, `recentActivity()`, `formatCurrency()`, `companyUsage()`, `capacityPercent()`.

- [ ] Write RED tests requiring executive metric hooks while confirming all existing primary metrics and analytics sections remain present.
- [ ] Add `executive-metric-grid` and `executive-metric-card` without changing data expressions.
- [ ] Restyle existing signup, revenue, plan distribution, top companies and activity panels without changing loops/calculations.
- [ ] Run shell + sidebar + overview tests and confirm GREEN.
- [ ] Run `git diff --check`.
- [ ] Commit with `feat(super-admin): refine executive overview dashboard`.

### Task 5: Normalize Enterprise Tables, Forms and Content Surfaces

**Files:**
- Create `super-admin-content-surfaces.test.mjs`
- Modify Super Admin HTML/SCSS

**Interfaces:**
- Preserve existing section templates, validators, bindings, submission handlers and API actions.

- [ ] Write tests for scoped table styling, scoped form controls, internal horizontal scroll containers, and key business section IDs.
- [ ] Run RED/baseline.
- [ ] Add scoped table rules with clear headers, consistent rows and internal `overflow-x: auto`.
- [ ] Add scoped 44-46px input/select controls and consistent textarea treatment.
- [ ] Reuse existing status/action classes; visual changes only.
- [ ] Run all `super-admin-*.test.mjs` tests.
- [ ] Run `git diff --check`.
- [ ] Commit with `feat(super-admin): normalize enterprise content surfaces`.

### Task 6: Add Responsive and Overflow Protection

**Files:**
- Create `super-admin-responsive-ui.test.mjs`
- Modify Super Admin SCSS
- Modify HTML only if inspection proves a mobile navigation control is required

**Interfaces:**
- Consume prior executive shell/sidebar.
- Do not create a second navigation system.

- [ ] Write RED tests requiring 1024px/767px breakpoints, `min-width: 0`, and one-column mobile grids.
- [ ] Add tablet layout.
- [ ] Simplify navbar on mobile.
- [ ] Collapse KPI/analytics/workspace grids to one column on mobile.
- [ ] Ensure wide tables scroll internally.
- [ ] Run all Super Admin tests and confirm GREEN.
- [ ] Run `git diff --check`.
- [ ] Commit with `feat(super-admin): add responsive executive layout`.

### Task 7: Full Regression and Angular Verification

- [ ] Run `node --test ".\tests\super-admin-*.test.mjs"`; expected 0 failures.
- [ ] Run relevant `company-admin-*.test.mjs` only for shared/global styling assumptions.
- [ ] Run `git diff --check`.
- [ ] From `frontend/crm-frontend`, run `npm run dev`.
- [ ] Visually verify Overview, Companies, Billing, Users, Roles/Permissions, Reports, Support, sticky navbar, notifications, refresh, section switching, no duplicate hero/back controls, no page-level horizontal overflow, unchanged KPI values, internal table scrolling and tablet/mobile behavior.
- [ ] Run `npm run build`.
- [ ] If build fails only on known unrelated module/style budget or Sass deprecation, report separately and do not modify unrelated modules.
- [ ] Inspect `git status --short`, `git diff --name-only origin/main...HEAD`, and recent log.

### Task 8: Safe Multi-Developer Integration

- [ ] `git fetch origin`
- [ ] Check `git rev-list --left-right --count HEAD...origin/main`.
- [ ] Review `git log --oneline HEAD..origin/main`.
- [ ] If remote changes overlap Super Admin files, stop and inspect before integration.
- [ ] Re-run Super Admin tests after integrating latest main.
- [ ] Run `git diff --check`.
- [ ] Push normally only after synchronization/verification.
- [ ] Never use `git push --force`.
- [ ] Never use `git reset --hard origin/main`.

---

## Final Verification Checklist

- Super Admin visually reads as the platform-level Executive Control Center.
- Executive graphite/navy sidebar is present.
- Existing menu IDs still work.
- Shared sticky global navbar shows current section.
- Notifications and Refresh remain functional.
- Super Admin identity remains visible.
- Duplicate hero and permanent duplicate Back controls are removed.
- KPI values and analytics calculations remain unchanged.
- Companies, billing, users, permissions, reports and support flows remain unchanged.
- Tables/forms share one enterprise visual language.
- No full-page horizontal overflow exists.
- Mobile/tablet hooks are present.
- Accessibility hooks are preserved/improved.
- All Super Admin tests pass.
- Relevant shared regressions pass.
- `git diff --check` passes.
- No unrelated feature module is modified.
- Runtime uploads remain untouched.
