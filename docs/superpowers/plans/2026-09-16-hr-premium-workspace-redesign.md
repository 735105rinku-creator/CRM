# HR Premium Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the complete existing HR workspace into a premium hybrid enterprise experience while preserving all existing HR functionality, API integrations, permissions, role restrictions, and feature identifiers.

**Architecture:** Preserve the existing `hr-dashboard.component` feature-routing model and backend integration. Implement the redesign incrementally inside the existing HTML, SCSS, and TypeScript component, adding only small UI state helpers needed for collapsible desktop navigation and the mobile drawer. Every visual phase is protected by structural regression tests before production markup/styles are changed.

**Tech Stack:** Angular standalone components, Angular control flow (`@if`, `@for`), Angular signals/computed state, Reactive Forms, SCSS, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-16-hr-premium-workspace-redesign-design.md`

## Global Constraints

- No database changes.
- No backend changes unless a separately verified frontend-blocking issue is found and explicitly approved.
- Preserve all existing HR API calls and submit behavior.
- Preserve all existing `HrFeature` feature identifiers.
- Preserve HR-only CRM, Accounts CRM, and Logistics restrictions.
- Preserve Company Admin and Super Admin HR monitoring behavior.
- Do not modify Sales or Logistics feature code.
- Do not perform a broad component architecture rewrite during this redesign.
- Keep the existing large HR component functional throughout incremental commits.
- Do not push or merge until manual HR workspace review is approved.

---

## File Structure

### Existing production files

- `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts` — HR state, feature selection, API orchestration, forms, computed values, actions.
- `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html` — HR shell, navigation and all HR feature templates.
- `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss` — HR workspace visual system and responsive rules.

### Existing regression file

- `frontend/crm-frontend/tests/hr-sales-logistics-access.test.mjs` — protects HR operational access restrictions.

### New regression file

- `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs` — structural contract for redesigned shell, grouped navigation, premium feature sections and responsive hooks.

---

### Task 1: Define the premium HR shell contract

**Files:**
- Create: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html`

**Interfaces:**
- Consumes: existing `activeFeature()`, `setFeature(feature)`, `isHrOnlyUser()`, `hrDisplayName()`, `hrProfileImage()`, notification actions and global search.
- Produces: semantic shell hooks `.hr-workspace`, `.hr-sidebar`, `.hr-topbar`, `.hr-content`, `.hr-nav-section`, `.hr-nav-toggle`, `.hr-mobile-backdrop` used by later tasks.

- [ ] **Step 1: Write the failing shell/navigation test**

Create `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const htmlPath = path.join(root, "src/app/features/hr/hr-dashboard.component.html");
const html = fs.readFileSync(htmlPath, "utf8");

test("HR premium shell exposes approved workspace structure", () => {
  assert.match(html, /class="[^"]*hr-workspace/);
  assert.match(html, /class="[^"]*hr-sidebar/);
  assert.match(html, /class="[^"]*hr-topbar/);
  assert.match(html, /class="[^"]*hr-content/);
});

test("HR navigation uses the approved HR groups", () => {
  for (const label of [
    "Overview",
    "People",
    "Time & Attendance",
    "Leave",
    "Payroll",
    "Organization",
    "Communication",
    "Account"
  ]) {
    assert.match(html, new RegExp(`>${label}<`));
  }
});

test("HR premium shell has desktop collapse and mobile drawer controls", () => {
  assert.match(html, /hr-nav-toggle/);
  assert.match(html, /hr-mobile-backdrop/);
});
```

- [ ] **Step 2: Run the new test and verify RED**

```powershell
cd frontend\crm-frontend
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

Expected: FAIL because the premium shell/group hooks do not exist yet.

- [ ] **Step 3: Implement the minimum semantic shell markup**

Regroup existing navigation without changing any existing `setFeature(...)` target:

```text
Overview
  dashboard

People
  employee
  add-employee
  employee-profile
  departments

Time & Attendance
  attendance
  attendance-reports

Leave
  leave-requests
  leave-calendar
  leave-balance
  leave-types

Payroll
  salary-structure
  payslip-generation
  payroll-processing
  payroll-reports

Organization
  meetings
  company-events
  holidays

Communication
  announcements
  messages

Account
  profile
  access
```

Keep CRM, Accounts CRM and Logistics management-only blocks guarded by the existing `!isHrOnlyUser()` condition.

- [ ] **Step 4: Verify GREEN and access regression**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
node --test .\tests\hr-sales-logistics-access.test.mjs
```

Expected: both suites PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html
git commit -m "feat(hr): reorganize premium workspace navigation"
```

---

### Task 2: Add collapsible desktop sidebar and mobile drawer state

**Files:**
- Modify: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html`

**Interfaces:**
- Produces: `isSidebarCollapsed`, `isMobileNavOpen`, `toggleSidebar()`, `toggleMobileNav()`, `closeMobileNav()`.
- Consumes: existing feature navigation and `setFeature()` behavior.

- [ ] **Step 1: Extend the UI test with a failing navigation-state contract**

Add:

```js
const tsPath = path.join(root, "src/app/features/hr/hr-dashboard.component.ts");
const ts = fs.readFileSync(tsPath, "utf8");

test("HR workspace exposes responsive navigation state", () => {
  assert.match(ts, /isSidebarCollapsed\s*=\s*signal\(false\)/);
  assert.match(ts, /isMobileNavOpen\s*=\s*signal\(false\)/);
  assert.match(ts, /toggleSidebar\s*\(/);
  assert.match(ts, /toggleMobileNav\s*\(/);
  assert.match(ts, /closeMobileNav\s*\(/);
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

- [ ] **Step 3: Add minimum Angular navigation state**

Add beside the existing signals:

```ts
protected readonly isSidebarCollapsed = signal(false);
protected readonly isMobileNavOpen = signal(false);

protected toggleSidebar(): void {
  this.isSidebarCollapsed.update((value) => !value);
}

protected toggleMobileNav(): void {
  this.isMobileNavOpen.update((value) => !value);
}

protected closeMobileNav(): void {
  this.isMobileNavOpen.set(false);
}
```

Bind the existing shell to the two states:

```html
<section
  class="hr-shell hr-workspace"
  [class.sidebar-collapsed]="isSidebarCollapsed()"
  [class.mobile-nav-open]="isMobileNavOpen()"
>
```

Add a desktop sidebar toggle, a mobile navigation trigger and a mobile backdrop. Preserve the existing feature-selection behavior. When the user selects a feature from mobile navigation, close the mobile drawer after the selection.

- [ ] **Step 4: Verify Task 2**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
node --test .\tests\hr-sales-logistics-access.test.mjs
node --test .\tests\employee-routing.test.mjs .\tests\company-admin-logistics-routing.test.mjs
```

Expected: premium UI contract and all existing access/routing regressions PASS.

- [ ] **Step 5: Commit Task 2**

```powershell
git add frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs
git commit -m "feat(hr): add responsive workspace navigation state"
```

---

### Task 3: Establish the Hybrid Premium visual system

**Files:**
- Modify: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss`

**Interfaces:**
- Consumes: semantic shell hooks created in Tasks 1 and 2.
- Produces: shared HR design tokens, surfaces, navigation treatment, form styling and table styling used by every later HR feature task.

- [ ] **Step 1: Add failing SCSS contract tests**

Extend `hr-premium-workspace-ui.test.mjs`:

```js
const scssPath = path.join(root, "src/app/features/hr/hr-dashboard.component.scss");
const scss = fs.readFileSync(scssPath, "utf8");

test("HR premium SCSS defines shared workspace surfaces", () => {
  assert.match(scss, /--hr-surface:/);
  assert.match(scss, /--hr-border:/);
  assert.match(scss, /--hr-shadow:/);
  assert.match(scss, /\.sidebar-collapsed/);
  assert.match(scss, /\.hr-nav-section/);
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
cd frontend\crm-frontend
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

Expected: FAIL because the premium design tokens and new shell styling do not exist yet.

- [ ] **Step 3: Add the HR-local premium token system**

Define the token layer on `.hr-workspace`:

```scss
.hr-workspace {
  --hr-bg: #f4f7fb;
  --hr-surface: #ffffff;
  --hr-surface-soft: #f8fafc;
  --hr-border: #e2e8f0;
  --hr-text: #0f172a;
  --hr-muted: #64748b;
  --hr-radius-sm: 12px;
  --hr-radius-md: 16px;
  --hr-radius-lg: 20px;
  --hr-shadow: 0 12px 32px rgba(15, 23, 42, 0.07);
  --hr-shadow-soft: 0 6px 18px rgba(15, 23, 42, 0.05);
}
```

Preserve the existing application/company theme variables for primary, accent and sidebar branding.

- [ ] **Step 4: Apply the shared visual system**

Refactor existing HR SCSS so these areas use the new token system:

- workspace background
- sidebar surface and navigation spacing
- section labels
- active navigation treatment
- topbar
- content canvas
- page headings
- cards and panels
- primary, secondary and tertiary buttons
- form controls
- filter toolbars
- tables
- status badges
- notices
- modal surfaces

Use subtle elevation rather than deep shadows everywhere. Keep dense operational screens compact and readable.

- [ ] **Step 5: Verify GREEN and diff quality**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
git diff --check
```

Expected: UI contract PASS and no whitespace errors.

- [ ] **Step 6: Commit Task 3**

```powershell
git add frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs
git commit -m "style(hr): establish hybrid premium workspace system"
```

---

### Task 4: Redesign the topbar and HR command-center dashboard

**Files:**
- Modify: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss`
- Modify only if existing dashboard values require a presentation helper: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts`

**Interfaces:**
- Consumes: existing dashboard data, employee summary, attendance summary, leave summary, payroll summary, birthdays, anniversaries, holidays, events, notification actions, global search and `refreshAll()`.
- Produces: `.hr-command-hero`, `.hr-quick-actions`, `.hr-kpi-grid`, `.hr-dashboard-grid`, `.hr-topbar-profile`.

- [ ] **Step 1: Add failing dashboard structure tests**

Extend the premium UI test:

```js
test("HR dashboard exposes premium command-center structure", () => {
  for (const hook of [
    "hr-command-hero",
    "hr-quick-actions",
    "hr-kpi-grid",
    "hr-dashboard-grid",
    "hr-topbar-profile"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});
```

- [ ] **Step 2: Verify RED**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

- [ ] **Step 3: Redesign the topbar**

Preserve existing global-search and notification behavior while presenting the header as one compact enterprise bar:

```text
Mobile menu / desktop context
Global search
HR workspace identity
Notification control
User avatar + name / compact profile identity
Logout/profile access
```

Remove visual duplication where the same user identity is repeated several times in the header.

Keep logout functionality available.

- [ ] **Step 4: Build the command hero with existing actions only**

The dashboard hero must contain:

```text
Human Resources / Workspace context
Live operational summary
Refresh
Add Employee
Daily Attendance
Create Announcement
```

Quick actions must call existing handlers or existing `setFeature(...)` targets. Do not create new APIs.

- [ ] **Step 5: Build the KPI layer from existing dashboard data**

Use existing values for:

```text
Total Employees
Present Today
On Leave
New Joiners
Pending Leave Requests
Payroll Status
```

If a value is absent from the API response, use the existing component fallback behavior rather than inventing data.

- [ ] **Step 6: Reorganize supporting dashboard panels**

Use the existing data already loaded by the component for:

- attendance summary
- department-wise employee distribution
- upcoming birthdays
- upcoming work anniversaries
- upcoming holidays
- upcoming company events
- recent HR activity or existing operational activity panels

Use `.hr-dashboard-grid` for desktop hierarchy rather than giving every panel identical width and importance.

- [ ] **Step 7: Verify GREEN and regressions**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
node --test .\tests\hr-sales-logistics-access.test.mjs
node --test .\tests\employee-routing.test.mjs .\tests\company-admin-logistics-routing.test.mjs
git diff --check
```

- [ ] **Step 8: Commit Task 4**

```powershell
git add frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs
git commit -m "feat(hr): redesign command center dashboard"
```

---

### Task 5: Redesign the People workspace

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss`
- Modify only where presentation state requires an existing filtering/computed helper: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts`
- Modify: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`

**Interfaces:**
- Consumes: existing `employeeSetupView`, `addEmployeeView`, `employeeProfileView`, `departmentStructureView`, employee forms, employee filters, validation and existing employee actions.
- Produces: `.people-toolbar`, `.employee-table-shell`, `.employee-form-section`, `.employee-profile-hero`, `.department-structure-grid`.

- [ ] **Step 1: Add failing People workspace structure test**

```js
test("HR People workspace exposes premium employee layout hooks", () => {
  for (const hook of [
    "people-toolbar",
    "employee-table-shell",
    "employee-form-section",
    "employee-profile-hero",
    "department-structure-grid"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});
```

- [ ] **Step 2: Verify RED**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

- [ ] **Step 3: Redesign All Employees**

Place the existing employee search/filter controls inside `.people-toolbar`.

Preserve:

- existing employee data source
- existing search behavior
- existing edit/view actions
- employee IDs
- department/designation values
- employment statuses

Presentation should emphasize:

```text
Avatar / identity
Employee code
Department
Designation
Employment status
Primary row actions
```

Wrap the table in `.employee-table-shell` so later responsive rules can manage overflow cleanly.

- [ ] **Step 4: Redesign Add Employee without changing form contracts**

Keep every existing `formControlName`, validator and submit handler unchanged.

Visually regroup the existing controls into `.employee-form-section` blocks:

```text
Basic Information
Employment Details
Contact Information
Bank Details
Statutory Details
Documents / Profile Image where currently supported
```

Use a clear section title and short contextual copy for each group.

Keep Save and Cancel actions visually persistent and easy to identify.

- [ ] **Step 5: Redesign Employee Profile**

Create `.employee-profile-hero` using existing profile data:

- employee photo
- display name
- employee code
- department
- designation
- status

Below the hero, visually group only information that already exists in the current screen/data:

- employment details
- attendance snapshot
- leave snapshot
- payroll snapshot
- contact details
- bank/statutory details
- document/history information already exposed

- [ ] **Step 6: Redesign Departments & Designations**

Wrap existing organization structure UI inside `.department-structure-grid`.

Preserve all existing create/edit/list behavior and IDs.

Use responsive cards/table shells to make department and designation relationships easier to scan.

- [ ] **Step 7: Verify GREEN and HR access regression**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
node --test .\tests\hr-sales-logistics-access.test.mjs
git diff --check
```

- [ ] **Step 8: Commit Task 5**

```powershell
git add frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs
git commit -m "feat(hr): redesign people workspace"
```

---

### Task 6: Redesign Attendance and Leave operations

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss`
- Modify only if an existing computed/filter helper needs presentation support: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts`
- Modify: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`

**Interfaces:**
- Consumes: existing attendance records, shifts, policies, attendance filters, leave requests, leave balances, leave types, leave calendar data and all current attendance/leave actions.
- Produces: `.attendance-summary-grid`, `.attendance-toolbar`, `.attendance-table-shell`, `.leave-summary-grid`, `.leave-approval-queue`, `.leave-calendar-shell`.

- [ ] **Step 1: Add failing Attendance and Leave structure tests**

Extend `hr-premium-workspace-ui.test.mjs`:

```js
test("HR Attendance and Leave workspaces expose premium operation hooks", () => {
  for (const hook of [
    "attendance-summary-grid",
    "attendance-toolbar",
    "attendance-table-shell",
    "leave-summary-grid",
    "leave-approval-queue",
    "leave-calendar-shell"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
cd frontend\crm-frontend
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

Expected: FAIL because the new Attendance and Leave layout hooks do not yet exist.

- [ ] **Step 3: Reorganize Daily Attendance**

Keep all existing attendance API calls, status values, filters and row actions unchanged.

Present Daily Attendance in this order:

```text
Attendance summary
  Present
  Absent
  Late
  Half Day
  On Leave

Filter toolbar
  Existing date filter
  Existing employee filter
  Existing department/filter controls

Attendance table
  Employee
  Date
  Shift
  Check In
  Check Out
  Work Duration
  Late Minutes
  Status
  Existing actions

Supporting policy/shift content already present
```

Wrap summary cards in `.attendance-summary-grid`, filters in `.attendance-toolbar` and the main table in `.attendance-table-shell`.

Use compact semantic status badges for existing attendance states only.

- [ ] **Step 4: Redesign Attendance Reports**

Present the current reports screen as:

```text
Page context / reporting period
Existing filters
Summary where already available
Results table
Existing export/report actions
```

Do not add new reporting calculations or endpoints.

- [ ] **Step 5: Reorganize Leave Requests around pending approvals**

Preserve current approve/reject handlers and remarks flow.

Layout order:

```text
Leave KPI summary
  Pending
  Approved
  Rejected
  On Leave Today where available

Pending approval queue
  Employee
  Leave Type
  Date Range
  Days
  Reason
  Existing approve/reject actions

Request history
```

Wrap the summary in `.leave-summary-grid` and the approval-first region in `.leave-approval-queue`.

- [ ] **Step 6: Redesign Leave Calendar, Balance and Types**

Leave Calendar:
- wrap the existing calendar in `.leave-calendar-shell`
- preserve current month/date navigation
- improve day-cell hierarchy and leave-state readability

Leave Balance:
- use shared summary/table treatment
- preserve all numeric values and current data source

Leave Types:
- use shared form/table card styling
- preserve all current configuration fields, validation and actions

- [ ] **Step 7: Verify GREEN and access regression**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
node --test .\tests\hr-sales-logistics-access.test.mjs
git diff --check
```

Expected: premium UI and HR access tests PASS with no whitespace errors.

- [ ] **Step 8: Commit Task 6**

```powershell
git add frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs
git commit -m "feat(hr): redesign attendance and leave workspace"
```

---

### Task 7: Redesign Payroll and Organization workspace

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss`
- Modify only if an existing presentation helper is required: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts`
- Modify: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`

**Interfaces:**
- Consumes: existing salary structures, payslips, payroll runs, payroll filters, meetings, events, holidays and all current actions.
- Produces: `.payroll-cycle-summary`, `.payroll-toolbar`, `.payroll-table-shell`, `.organization-calendar-grid`, `.organization-upcoming-list`.

- [ ] **Step 1: Add failing Payroll and Organization structure tests**

```js
test("HR Payroll and Organization workspaces expose premium layout hooks", () => {
  for (const hook of [
    "payroll-cycle-summary",
    "payroll-toolbar",
    "payroll-table-shell",
    "organization-calendar-grid",
    "organization-upcoming-list"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

- [ ] **Step 3: Redesign Salary Structure**

Keep all existing salary form fields, calculations, employee selection and save/update behavior unchanged.

Presentation order:

```text
Page summary
Employee / effective-period controls
Salary structure form or table
Gross / deduction / net figures already available
Existing save/update actions
```

Use shared financial data-table styling for numeric columns.

- [ ] **Step 4: Redesign Payslip Generation**

Preserve current month/year selection, employee scope, generation behavior and PDF/download actions.

Use:
- `.payroll-toolbar` for period and employee controls
- `.payroll-table-shell` for payslip results
- clear generated/pending/status badges based only on current values

- [ ] **Step 5: Redesign Payroll Processing**

Payroll Processing must visually prioritize the current payroll cycle before the data table.

Wrap current cycle information in `.payroll-cycle-summary`.

Show only data already provided by the current payroll model/API:

```text
Payroll Code
Period
Payment Date
Status
Total Employees
Gross Salary
Deductions
Net Salary
```

Then show the existing processing controls and data table.

Do not modify payroll calculations, status transitions or backend requests.

- [ ] **Step 6: Redesign Payroll Reports**

Use the same reporting pattern as Attendance Reports:

```text
Report context
Period / employee filters
Summary
Financial table
Existing report/export actions
```

- [ ] **Step 7: Redesign Meetings**

Preserve current meeting form, attendee data, meeting-mode fields, status values and actions.

Present upcoming meetings first using `.organization-upcoming-list`.

Each meeting presentation should emphasize:
- title
- date/time
- meeting mode
- venue or meeting link
- status
- attendee summary where already available

- [ ] **Step 8: Redesign Company Events and Holidays**

Company Events:
- upcoming-first list/card presentation
- preserve existing create/edit controls and event fields

Holidays:
- calendar/list hybrid visual treatment
- preserve holiday name, date, type, paid/active state and existing actions

Use `.organization-calendar-grid` for the combined responsive organization layout.

- [ ] **Step 9: Verify GREEN and regressions**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
node --test .\tests\hr-sales-logistics-access.test.mjs
node --test .\tests\employee-routing.test.mjs .\tests\company-admin-logistics-routing.test.mjs
git diff --check
```

- [ ] **Step 10: Commit Task 7**

```powershell
git add frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs
git commit -m "feat(hr): redesign payroll and organization workspace"
```

---

### Task 8: Redesign Communication, Profile and Security

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss`
- Modify only if presentation state requires it: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts`
- Modify: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`

**Interfaces:**
- Consumes: existing announcements, internal messages, message polling/reply behavior, profile form, profile image, password form and security actions.
- Produces: `.announcement-workspace`, `.message-workspace`, `.message-thread`, `.profile-summary-card`, `.security-card`.

- [ ] **Step 1: Add failing Communication/Profile structure tests**

```js
test("HR Communication and Profile screens expose premium layout hooks", () => {
  for (const hook of [
    "announcement-workspace",
    "message-workspace",
    "message-thread",
    "profile-summary-card",
    "security-card"
  ]) {
    assert.match(html, new RegExp(hook));
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
cd frontend\crm-frontend
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

- [ ] **Step 3: Redesign Announcements**

Preserve current create, load and audience behavior.

Use `.announcement-workspace` to present:
- clear Create Announcement action
- existing audience/department information
- published/current status where already available
- recent announcements
- explicit empty state

Do not invent draft or scheduling behavior unless already supported by the current model/API.

- [ ] **Step 4: Redesign Internal Messaging**

Use `.message-workspace` as a desktop split layout:

```text
Left
  Conversation/message list
  Sender/recipient
  Subject
  Timestamp
  Unread state

Right
  Active message
  Message body
  Thread/replies
  Existing reply/send controls
```

Wrap the active conversation region in `.message-thread`.

Preserve all existing API polling, message loading, send and reply behavior.

- [ ] **Step 5: Redesign Profile Settings**

Create `.profile-summary-card` containing existing:
- profile image
- display name
- HR role/designation context
- email
- employee identity fields already available

Below it, keep the existing editable profile form and submit handlers unchanged.

- [ ] **Step 6: Redesign Change Password / Security**

Wrap the existing password form in `.security-card`.

Keep:
- current password fields
- existing validation
- submit handler
- success/error behavior

Visually separate security actions from general profile information.

- [ ] **Step 7: Verify GREEN and access regression**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
node --test .\tests\hr-sales-logistics-access.test.mjs
git diff --check
```

- [ ] **Step 8: Commit Task 8**

```powershell
git add frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs
git commit -m "feat(hr): redesign communication and profile workspace"
```

---

### Task 9: Complete responsive behavior and accessibility pass

**Files:**
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html`
- Modify: `frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss`
- Modify: `frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs`

**Interfaces:**
- Consumes: sidebar state and feature hooks created by Tasks 1 through 8.
- Produces: final desktop collapse behavior, tablet layout, mobile drawer behavior, responsive forms/cards/tables and visible keyboard-focus treatment.

- [ ] **Step 1: Add failing responsive contract test**

```js
test("HR workspace defines tablet and mobile responsive layers", () => {
  assert.match(scss, /@media\s*\(max-width:\s*1024px\)/);
  assert.match(scss, /@media\s*\(max-width:\s*768px\)/);
  assert.match(scss, /\.mobile-nav-open/);
  assert.match(scss, /\.hr-mobile-backdrop/);
  assert.match(scss, /:focus-visible/);
});
```

- [ ] **Step 2: Verify RED**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

- [ ] **Step 3: Implement desktop behavior above 1024px**

Desktop must support:
- expanded sidebar
- collapsed icon-rail sidebar
- multi-column dashboard layouts
- wide operational tables
- consistent sticky/persistent topbar behavior

- [ ] **Step 4: Implement tablet behavior at 1024px and below**

Tablet must support:
- reduced sidebar footprint
- two-column KPI/card grids where practical
- wrapped filter/action toolbars
- horizontally usable tables
- no content clipped behind navigation

- [ ] **Step 5: Implement mobile behavior at 768px and below**

Mobile must support:
- off-canvas sidebar
- visible backdrop while drawer is open
- drawer close through backdrop
- drawer close after feature selection
- compact topbar
- single-column content
- single-column forms
- touch targets at least 40px high where practical
- horizontal overflow shell for data-heavy tables
- stacked messaging layout
- no horizontal page overflow

- [ ] **Step 6: Add keyboard-visible focus states**

Use `:focus-visible` for:
- navigation buttons
- sidebar toggle
- mobile menu trigger
- icon buttons
- primary actions
- form controls
- table/action buttons

Do not remove native focus behavior without an accessible replacement.

- [ ] **Step 7: Verify GREEN and full routing regressions**

```powershell
node --test .\tests\hr-premium-workspace-ui.test.mjs
node --test .\tests\hr-sales-logistics-access.test.mjs
node --test .\tests\employee-routing.test.mjs .\tests\company-admin-logistics-routing.test.mjs
git diff --check
```

- [ ] **Step 8: Commit Task 9**

```powershell
git add frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss frontend/crm-frontend/tests/hr-premium-workspace-ui.test.mjs
git commit -m "style(hr): complete responsive premium workspace"
```

---

### Task 10: Full regression, Angular build and manual acceptance

**Files:**
- Test only unless verification reveals a real HR regression.

**Interfaces:**
- Consumes: completed Tasks 1 through 9.
- Produces: verified HR redesign branch ready for user review before any push/merge.

- [ ] **Step 1: Run premium HR UI tests**

```powershell
cd frontend\crm-frontend
node --test .\tests\hr-premium-workspace-ui.test.mjs
```

Expected: all premium structural UI tests PASS.

- [ ] **Step 2: Run HR access regression**

```powershell
node --test .\tests\hr-sales-logistics-access.test.mjs
```

Expected: all current HR access-restriction tests PASS.

- [ ] **Step 3: Run related routing regressions**

```powershell
node --test .\tests\employee-routing.test.mjs .\tests\company-admin-logistics-routing.test.mjs
```

Expected: all existing related routing tests PASS.

- [ ] **Step 4: Run Angular production build**

```powershell
npm run build
```

Expected: Angular build completes successfully.

If a pre-existing unrelated style-budget failure appears, capture the exact component and budget output. Do not weaken application budgets as part of the HR redesign.

- [ ] **Step 5: Verify branch diff quality**

From repository worktree root:

```powershell
cd ..\..\..
git diff origin/main...HEAD --check
git status -sb
git diff --stat origin/main...HEAD
```

Expected:
- no whitespace errors
- only intended HR redesign, HR test, spec and plan files changed
- no backend/database changes

- [ ] **Step 6: Manual desktop acceptance**

Verify every major HR workspace screen:

```text
Overview
  Dashboard

People
  All Employees
  Add Employee
  Employee Profile
  Departments & Designations

Time & Attendance
  Daily Attendance
  Attendance Reports

Leave
  Requests
  Calendar
  Balance
  Types

Payroll
  Salary Structure
  Payslip Generation
  Payroll Processing
  Payroll Reports

Organization
  Meetings
  Company Events
  Holiday Calendar

Communication
  Announcements
  Internal Messaging

Account
  Profile Settings
  Change Password
```

Also verify:
- sidebar collapse/expand
- global search
- notification panel
- profile identity
- logout
- modals
- success/error notices

- [ ] **Step 7: Manual tablet/mobile acceptance**

Verify:
- navigation drawer opens
- navigation drawer closes through backdrop
- navigation drawer closes after selecting a feature
- topbar controls remain reachable
- cards stack correctly
- forms remain usable
- tables remain readable/scrollable
- message workspace remains usable
- no unexpected page-level horizontal overflow

- [ ] **Step 8: Role-specific manual acceptance**

HR-only login must still have:
- no Sales CRM operational navigation
- no Accounts CRM navigation
- no Logistics operational navigation
- restricted stale feature parameters blocked
- no restricted Sales/Logistics background preload

Company Admin/Super Admin HR workspace monitoring must retain currently supported management visibility.

- [ ] **Step 9: Create a correction commit only if verification required code changes**

If Task 10 requires no correction, do not create an empty commit.

---

## Execution Sequence

Execute strictly in this order:

1. Premium shell contract and grouped navigation
2. Sidebar collapse and mobile drawer state
3. Hybrid Premium visual system
4. Topbar and HR command-center dashboard
5. People workspace
6. Attendance and Leave
7. Payroll and Organization
8. Communication, Profile and Security
9. Responsive and accessibility pass
10. Full regression, build and manual acceptance

Every production task follows:

```text
Write failing structural/regression test
Run and observe RED
Implement the minimum required UI change
Run and observe GREEN
Run existing HR/routing regressions
Run git diff --check
Commit the verified task
```

Do not combine multiple unverified redesign phases into one commit.

Do not push or merge before manual acceptance is complete.
