# Super Admin Executive Control Center — Design Specification

**Date:** 2026-09-15
**Scope:** Frontend Super Admin UI enhancement only
**Project:** OPAS BIZZ CRM
**Feature path:** `frontend/crm-frontend/src/app/features/super-admin/`

---

## 1. Objective

Upgrade the existing Super Admin workspace into a premium enterprise
"Executive Control Center" while preserving all existing business logic,
routing, APIs, permissions, billing flows, company management flows,
support flows and backend behavior.

The Super Admin should visually feel like the highest-level platform
workspace while still belonging to the same OPAS BIZZ design system as
Company Admin and Accounts.

---

## 2. Non-Goals

The following are explicitly out of scope:

- No backend API changes.
- No database changes, migrations, seeds, resets or deletes.
- No permission or authorization changes.
- No changes to Super Admin business rules.
- No redesign of Company Admin, Accounts, Sales, Logistics, Purchase or HR.
- No changes to existing company onboarding, billing, subscriptions,
  users, support, reports or platform-management behavior.
- No new external UI/icon dependency unless absolutely required.
- No replacement of working routes with a new routing architecture.

---

## 3. Existing Super Admin Structure

The current Super Admin implementation already contains:

- Dedicated Super Admin feature.
- Sticky left sidebar.
- Platform topbar.
- Separate hero/header section.
- Notification panel.
- Super Admin profile/user information.
- Company management.
- Company onboarding requests.
- Suspended/blocked companies.
- Subscription and billing management.
- Plans.
- Invoices and payment history.
- Payment gateway settings.
- Coupons/discounts.
- Platform user management.
- Platform admins/sub-admins.
- Login activity logs.
- Roles and permissions.
- CRM and HRM platform defaults.
- Reports and analytics.
- Support/ticket functionality.
- Company signup trend.
- Revenue trend.
- Plan distribution.
- Platform KPIs.

The redesign must reuse these existing flows instead of reimplementing them.

---

## 4. Design Direction

### Executive Control Center

Super Admin will use a darker and more authoritative visual treatment
than Company Admin while remaining part of the same product family.

Primary characteristics:

- Executive graphite/navy sidebar.
- Royal blue platform accent.
- Clean light workspace canvas.
- Single shared sticky global navbar.
- Strong information hierarchy.
- Premium flat cards with subtle elevation.
- Compact, professional typography.
- Context-aware navigation.
- Clear status colors.
- High-density enterprise tables without visual clutter.

---

## 5. Color System

### Base

- Executive Midnight: `#0B1220`
- Graphite Surface: `#111827`
- Royal Blue: `#2563EB`
- Electric Blue: `#3B82F6`
- Workspace Canvas: `#F5F7FB`
- White Surface: `#FFFFFF`

### Typography

- Primary Text: `#111827`
- Secondary Text: `#475569`
- Muted Text: `#64748B`
- Border: `#E2E8F0`

### Status

- Success: `#10B981`
- Warning: `#F59E0B`
- Danger: `#EF4444`
- Information: `#3B82F6`

Heavy gradients, oversized shadows and strong neumorphism are not part of
the Super Admin design.

---

## 6. Typography

Preferred scoped font stack:

`Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif`

Hierarchy:

- Main section title: 20–22px / 700–750.
- Sidebar parent: approximately 13–14px / 650–700.
- Sidebar child: approximately 12–13px / 550–600.
- Card metric: 26–32px / 700–800.
- Body: 13–14px.
- Supporting labels: 11–12px.

---

## 7. Main Shell

The shell remains structurally compatible with the existing Super Admin
component.

Desktop structure:

1. Fixed/sticky executive sidebar.
2. Main workspace.
3. Shared sticky global navbar at the top of the workspace.
4. Section content below the navbar.

The existing separate `platform-topbar` + `platform-hero` presentation
will be consolidated so that repeated page identity is not displayed
twice.

---

## 8. Shared Sticky Global Navbar

The Super Admin navbar will remain visible while content scrolls.

### Left side

- `SUPER ADMIN` or `GLOBAL CONTROL` workspace badge.
- Current section title derived from existing section state.
- Short platform-level subtitle/context.

Example:

`SUPER ADMIN | Overview`

Subtitle:

`Platform companies, subscriptions, users and system operations`

### Right side

- Notification control.
- Refresh action.
- Current Super Admin profile card.
- Name.
- Super Admin role.
- Initial/avatar.

Existing notification behavior must be reused.

The navbar must use approximately:

- `position: sticky`
- `top: 0`
- elevated `z-index`
- light translucent/solid surface
- subtle bottom border
- subtle shadow

No route logic should be moved into the navbar unnecessarily.

---

## 9. Back Navigation

The current Super Admin UI contains duplicate Back controls.

Design decision:

- Remove redundant Back buttons from the permanent shell.
- Preserve a Back control only where a specific detail/drill-down workflow
  genuinely requires it.
- Never use broken/encoded arrow characters.
- Use inline SVG icons if a back icon is required.

---

## 10. Executive Sidebar

The sidebar becomes the primary platform navigation.

### Visual treatment

- Deep navy/graphite background.
- No heavy glow.
- Professional iconography.
- Compact spacing.
- Clear active state.
- Thin premium scrollbar.
- Footer-separated account/logout area.

### Parent groups

Existing menu groups remain intact, including:

- Dashboard
- Companies
- Subscriptions & Billing
- Users Management
- Roles & Permissions
- CRM Module Settings
- HRM Module Settings
- Reports & Analytics
- Support & Tickets
- Any other currently implemented platform groups

No menu functionality is removed.

### Accordion behavior

Recommended behavior:

- One parent group expanded at a time.
- Selecting a child keeps its parent expanded.
- Smooth open/close transition.
- Accessible `aria-expanded`.
- Keyboard-friendly child navigation.
- Existing active section continues to drive selection.

### Icons

Use meaningful inline SVG icons for:

- Dashboard
- Companies
- Billing
- Users
- Permissions
- CRM
- HRM
- Reports
- Support
- Settings
- Logs
- Payments
- Plans
- Invoices

No third-party icon package is required.

---

## 11. Overview Dashboard

The Overview page becomes the Executive Control Center landing page.

Existing live data stays unchanged.

### Primary KPI cards

Prominent cards:

- Total Companies
- Total Users
- New Signups
- MRR / Revenue
- Active Subscriptions
- Support Tickets

Company status should visually expose:

- Active
- Trial
- Suspended

without adding new backend fields.

### Card rules

- White background.
- 1px soft border.
- 16–18px radius.
- Subtle shadow.
- Small icon/status indicator.
- Clear metric hierarchy.
- No oversized decorative gradients.

---

## 12. Analytics

Existing analytics data is retained:

- Company Signup Trend.
- Revenue Growth.
- Plan Distribution.
- Top Active Companies.
- Recent Activity.

Visual improvements:

- Consistent chart containers.
- Clear chart labels.
- Cleaner bar/metric presentation.
- Better hover/focus states where already interactive.
- Responsive wrapping.

No charting library should be introduced unless existing implementation
cannot meet the design.

---

## 13. Companies Workspace

Company-related screens should share one enterprise visual language.

Applies to:

- All Companies.
- Add New Company.
- Company Details.
- Suspended/Blocked Companies.
- Onboarding Requests.

### Tables

- Clear header row.
- Sticky table header where useful.
- Comfortable 44–48px row height.
- Status pills.
- Consistent action buttons.
- Horizontal scrolling only inside table wrappers, never on the full page.
- Search/filter controls grouped above the table.

### Forms

- 44–46px controls.
- Consistent labels.
- Clear validation.
- Two-column layout where appropriate.
- Single column on narrow screens.

Existing forms and validation logic are preserved.

---

## 14. Subscription & Billing Workspace

Existing billing functionality stays unchanged.

Visual treatment should emphasize:

- Plan identity.
- Price.
- Duration.
- Employee/HR limits.
- Subscription status.
- Payment status.
- Expiry state.
- Gateway configuration.

Dangerous actions should visually use danger styling but should not have
their behavior altered.

---

## 15. Users / Roles / Permissions

Existing permission and account-management behavior must remain intact.

UI improvements:

- Search and filter hierarchy.
- Role badges.
- Account-status badges.
- Cleaner permission matrix.
- Better horizontal scrolling for wide permission tables.
- Clear primary vs destructive actions.

No new permissions are created as part of this redesign.

---

## 16. Reports and Platform Settings

Report pages and platform-setting screens use consistent panels:

- Page heading.
- Filters.
- Summary.
- Main data surface.
- Export/action controls.

Existing report calculations and API calls remain unchanged.

---

## 17. Notifications

Existing Super Admin notification behavior will be preserved.

Visual updates:

- Premium popover.
- Clear unread state.
- Priority/status chips.
- Timestamp hierarchy.
- Scrollable body.
- Proper close action.
- Suitable viewport positioning.

No notification API or read-state behavior is modified unless a UI defect
requires a strictly presentation-level fix.

---

## 18. Responsive Behavior

### Desktop

- Persistent left sidebar.
- Sticky global navbar.
- Multi-column dashboard.

### Tablet

- Reduced sidebar/content spacing.
- Analytics cards wrap.
- Tables remain internally scrollable.

### Mobile

- Compact navbar.
- Hide nonessential navbar subtitle text.
- Profile card collapses to avatar where necessary.
- Dashboard becomes one column.
- No page-level horizontal scrollbar.

If the existing Super Admin sidebar does not support a mobile drawer,
that can be enhanced only if it can be done without altering route logic.

---

## 19. Accessibility

UI enhancement must preserve/improve:

- Native buttons.
- `aria-expanded` on accordion parents.
- `aria-label` for icon-only buttons.
- Visible keyboard focus.
- Adequate color contrast.
- Semantic headings.
- No click-only inaccessible `div` controls.

---

## 20. Technical Scope

Primary expected files:

- `frontend/crm-frontend/src/app/features/super-admin/super-admin-dashboard.component.html`
- `frontend/crm-frontend/src/app/features/super-admin/super-admin-dashboard.component.scss`
- `frontend/crm-frontend/src/app/features/super-admin/super-admin-dashboard.component.ts`

New frontend regression tests may be added under:

- `frontend/crm-frontend/tests/`

Shared/core files should not be changed unless inspection proves a shared
shell dependency is required.

---

## 21. Implementation Safety

Because multiple developers work on the repository:

- Work from latest `origin/main`.
- Use an isolated feature branch/worktree if appropriate.
- Never force-push.
- Never reset other developers' work.
- Do not stage runtime uploads.
- Do not modify unrelated modules.
- Re-fetch before integration/push.
- Prefer fast-forward integration when repository state permits.

Existing runtime upload paths must remain untouched.

---

## 22. TDD / Verification

Implementation will follow RED → GREEN → REFACTOR.

Target regression areas:

1. Executive shell styling hooks.
2. Shared sticky Super Admin navbar.
3. Sidebar parent/child hierarchy.
4. Accordion behavior.
5. SVG icons.
6. No duplicate permanent Back buttons.
7. No separate duplicate hero identity.
8. Existing section IDs remain available.
9. Existing business bindings/actions remain present.
10. Responsive layout hooks.
11. Existing Super Admin tests remain green.

Before completion:

- `git diff --check`
- targeted Super Admin tests
- relevant existing Company Admin/shared regressions if shared code is touched
- Angular development compilation
- production build only if unrelated existing budget blockers do not prevent it

A build failure caused by an already-existing unrelated module must be
reported separately and must not be "fixed" by modifying that module.

---

## 23. Success Criteria

The redesign is successful when:

- Super Admin visually reads as the highest-level OPAS BIZZ workspace.
- Existing Super Admin functionality behaves exactly as before.
- Sidebar navigation is clearer and more scalable.
- Current section is always visible in the sticky navbar.
- Overview KPIs and analytics are easier to scan.
- Tables/forms follow one enterprise system.
- No full-page horizontal overflow exists.
- Existing APIs, routes, permissions and database behavior remain unchanged.
- No unrelated module is modified.

---

## 24. Approved Direction

Selected approach:

**Executive Control Center**

Not selected:

- Direct Company Admin clone.
- Full platform rewrite.

The selected approach intentionally balances premium visual hierarchy,
existing-code safety, implementation speed and maintainability.
