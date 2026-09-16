# HR Premium Workspace Redesign — Design Specification

Date: 2026-09-16
Branch: feature/hr-premium-workspace-redesign
Base: origin/main

## 1. Objective

Redesign the complete HR workspace into a premium enterprise HR experience while preserving all existing working HR functionality, APIs, permissions, role restrictions, and backend flows.

The redesign covers:
- HR shell and workspace layout
- Sidebar and navigation organization
- Topbar and global actions
- Dashboard
- Employee management
- Attendance
- Leave management
- Payroll
- Meetings, events, and holidays
- Communication
- Profile and security
- Tables, forms, modals, filters, empty/loading/error states
- Desktop, tablet, and mobile responsive behavior

## 2. Non-Goals

- No database changes
- No backend redesign
- No Sales or Logistics business-feature changes
- No removal of existing HR functionality
- No permission broadening
- No re-enabling CRM or Logistics access for HR-only users
- No risky full component decomposition in this phase unless implementation proves it necessary

## 3. Visual Direction

Use a Hybrid Premium design:
- Modern enterprise information architecture
- Subtle neumorphism for cards, KPI tiles, buttons, selected states, and important panels
- Clean white/light-slate content surfaces
- Dark premium navigation shell
- Strong typography hierarchy
- Restrained gradients only where visually useful
- Compact, professional data-dense tables and forms
- Consistent spacing, radii, shadows, status badges, and interaction states

## 4. Workspace Shell

### Desktop

- Collapsible left sidebar
- Expanded state shows icon + label
- Collapsed state shows icon rail with tooltip support
- Main content area gains more horizontal working space when collapsed
- Sticky or persistent topbar
- Scroll contained inside the main content region

### Tablet

- Sidebar defaults narrower or collapsed
- Navigation remains accessible without consuming excessive width
- Filters and action groups wrap cleanly
- KPI grids reduce to two columns where appropriate

### Mobile

- Sidebar becomes an off-canvas drawer
- Compact topbar
- Single-column content
- Primary actions remain thumb-friendly
- KPI cards stack or use horizontal swipe where useful
- Forms become one-column
- Dense tables either scroll horizontally or switch to compact record cards when appropriate

## 5. Navigation Architecture

Reorganize HR navigation without changing the underlying feature behavior.

### Overview
- Dashboard

### People
- All Employees
- Add Employee
- Employee Profiles
- Departments & Designations

### Time & Attendance
- Daily Attendance
- Attendance Reports

### Leave
- Requests
- Calendar
- Balances
- Leave Types

### Payroll
- Salary Structure
- Payslip Generation
- Payroll Processing
- Payroll Reports

### Organization
- Meetings
- Company Events
- Holiday Calendar

### Communication
- Announcements
- Internal Messaging

### Account
- Profile Settings
- Change Password

### Role Preservation

- HR-only users must continue to have CRM and Logistics hidden
- HR-only users must continue to be blocked from restricted stale feature query parameters
- Company Admin and Super Admin HR-monitoring behavior must remain available where currently supported
- Existing Sales and Logistics access rules must remain unchanged

## 6. Topbar

Redesign the topbar into a compact enterprise control bar with:
- Global search
- Current HR context / workspace label
- Notifications
- User avatar and identity
- Profile/security menu access
- Responsive action reduction on smaller screens

Remove visual duplication where the same user identity/logout information appears in multiple competing locations.

## 7. Dashboard — HR Command Center

The dashboard becomes an operational HR command center rather than a flat collection of equal cards.

### Primary summary
- Welcome / HR overview panel
- Current date/context
- Refresh action
- Quick actions such as Add Employee, Attendance, Announcement, Payroll where supported by existing behavior

### KPI layer
- Total Employees
- Present Today
- On Leave
- New Joiners
- Pending Leave Requests
- Payroll / processing status where supported by existing data

### Analytics and operational content
- Attendance trend
- Department-wise employee distribution
- Leave overview
- Upcoming birthdays and work anniversaries
- Upcoming events and holidays
- Recent HR activity
- Pending approvals
- Important alerts
- Recent notifications

Visual importance must reflect operational priority instead of giving every card identical weight.

## 8. Employee Management

### All Employees
- Search
- Department filter
- Designation filter
- Status filter
- Employee avatar
- Employee ID
- Designation / department
- Employment status badges
- Quick actions for view/edit using existing behavior
- Responsive employee-card layout on narrow screens

### Add Employee

Group the existing employee form into structured sections:
- Basic Information
- Employment Details
- Contact Information
- Bank Details
- Statutory Details
- Documents / profile image where already supported

Use:
- Clear section hierarchy
- Progress / section context
- Consistent validation presentation
- Sticky or persistent Save / Cancel actions where practical

### Employee Profile

Organize existing information into:
- Profile summary
- Employment information
- Attendance snapshot
- Leave snapshot
- Payroll snapshot
- Contact details
- Bank and statutory information
- Existing activity/history data where available

## 9. Attendance

Attendance screens should prioritize today's operation first, reporting second.

Structure:
- Summary metrics
- Date / employee / department filters
- Main attendance table
- Clear Present / Absent / Late / Leave style status badges based on existing states
- Report view with professional filter hierarchy
- Responsive table behavior

## 10. Leave Management

Prioritize pending approval workflow.

Structure:
- Leave KPI summary
- Pending requests
- Approved / rejected history
- Calendar view
- Leave balances
- Leave type configuration
- Employee / department / date filters
- Clear approve/reject actions using existing backend behavior

## 11. Payroll

Payroll screens should emphasize the current cycle and processing state.

Structure:
- Current payroll status summary
- Salary structure
- Payslip generation
- Payroll processing
- Payroll reports
- Employee / period filters
- Clear status badges
- Compact professional financial tables

## 12. Organization

### Meetings
- Upcoming-first layout
- Clear date/time/location/context
- Cleaner create/edit presentation

### Company Events
- Calendar/list hybrid presentation where practical
- Upcoming events visually prioritized

### Holidays
- Calendar-oriented view where useful
- Compact list fallback
- Clear add/edit actions

## 13. Communication

### Announcements
- Strong primary create-announcement action
- Audience/department targeting shown clearly
- Published/scheduled/draft-style states only where supported by existing data
- Clean recent-announcements list or cards
- Improved empty state

### Internal Messaging
- Desktop split layout: conversation list + active conversation
- Clear unread hierarchy
- Timestamp hierarchy
- Mobile conversation list first, thread second
- Preserve existing polling/API behavior

## 14. Profile & Security

Profile area should contain:
- Employee photo
- Name
- Designation
- Employee identity information
- Personal/work details grouped cleanly

Security area should isolate Change Password into a dedicated security card.

Logout must remain consistently accessible from the workspace navigation/user menu.

## 15. Shared Component Styling Rules

### Cards
- 14–18px radius depending on hierarchy
- White/light surfaces
- Soft border
- Subtle neumorphic elevation only where useful

### Buttons
- One clear primary action per operational region
- Secondary and tertiary actions visually distinct
- Destructive actions clearly separated

### Forms
- Consistent labels
- Predictable input heights
- Clear focus states
- Inline validation
- Logical section grouping

### Tables
- Compact row height
- Sticky headers where beneficial
- Search/filter toolbar above data
- Clear badges
- Action controls aligned consistently
- Horizontal overflow handling

### States
- Loading
- Empty
- Success
- Warning
- Error
- Disabled

All states must use consistent visual language.

## 16. Responsive Strategy

Desktop:
- Multi-column KPI and analytics layouts
- Full tables
- Collapsible sidebar

Tablet:
- Two-column cards
- Wrapped action/filter groups
- Reduced sidebar footprint

Mobile:
- Drawer navigation
- Single-column cards/forms
- Compact topbar
- Scrollable or card-based table treatment
- Touch-friendly controls

## 17. Functional Preservation

The redesign must preserve:
- Existing HR API calls
- Existing forms and submit behavior
- Existing query-parameter feature navigation unless intentionally mapped
- Existing attendance flows
- Existing leave workflows
- Existing payroll flows
- Existing announcements/messages behavior
- Existing profile/security behavior
- Existing notifications
- Existing role restrictions
- Existing Company Admin/Super Admin monitoring behavior

## 18. Implementation Boundaries

Primary expected frontend files:
- frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.html
- frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.scss
- frontend/crm-frontend/src/app/features/hr/hr-dashboard.component.ts

Tests may be added or updated under:
- frontend/crm-frontend/tests/

Do not touch backend files unless a separately verified frontend-blocking issue requires it and that change is explicitly approved.

## 19. Testing Strategy

Before integration:
- Preserve existing hr-sales-logistics-access regression tests
- Preserve employee routing regression tests
- Preserve Company Admin Logistics routing regression tests
- Add UI structure tests for grouped HR navigation
- Add tests for collapsible/responsive workspace shell where practical
- Verify restricted CRM/Logistics sections stay hidden for HR-only users
- Verify stale restricted feature parameters remain blocked
- Verify Company Admin/Super Admin monitoring behavior remains intact
- Run Angular compilation/build verification
- Run git diff --check

Manual verification:
- Dashboard
- Employees
- Add Employee
- Employee Profile
- Attendance
- Attendance Reports
- Leave Requests
- Leave Calendar
- Payroll
- Meetings
- Events
- Holidays
- Announcements
- Messaging
- Profile
- Change Password
- Desktop
- Tablet
- Mobile

## 20. Delivery Strategy

Implement incrementally in the isolated feature worktree.

Recommended implementation order:
1. Shell + sidebar + topbar
2. Shared design tokens / reusable visual classes
3. Dashboard
4. Employee pages
5. Attendance
6. Leave
7. Payroll
8. Organization
9. Communication
10. Profile/security
11. Responsive pass
12. Regression + build + manual review

No push or merge until the redesigned HR workspace has been manually reviewed and approved.
