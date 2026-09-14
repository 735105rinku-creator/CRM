# Company Admin Premium UI Design

Date: 2026-09-14

## Goal

Enhance the existing Company Admin workspace with:

- premium professional styling
- Deep Navy + Electric Blue + Soft White visual system
- one-open-at-a-time expandable sidebar
- improved active navigation states
- improved responsive behavior
- improved cards, tables, forms, buttons and feedback states
- fixes for verified Company Admin UI/runtime issues

Existing business flows must remain intact.

## Existing Architecture

The current Company Admin workspace primarily uses:

- company-admin-dashboard.component.ts
- company-admin-dashboard.component.html
- company-admin-dashboard.component.scss

The sidebar already uses the existing `menuGroups` structure.

The Company Admin component is large and contains many existing embedded flows. This phase must not perform a broad component rewrite or decomposition.

Changes must remain targeted to the Company Admin shell, navigation and presentation layer.

## Scope Boundaries

Do not change:

- database structure
- migrations
- seeds
- database data
- Sales business logic
- Logistics business logic
- Purchase business logic
- HR business logic
- Accounts business logic
- permission architecture
- unrelated backend APIs
- Tally integration

Shared/core changes are allowed only when strictly necessary and must be minimal.

## Sidebar Design

The sidebar will use accordion behavior.

Only one module group may be expanded at a time.

When a module is expanded:

- the previously open module collapses
- the selected module expands
- its child navigation items become visible

When a child section is active:

- its parent module automatically remains expanded
- the active child receives a clear active state
- navigation state remains stable while switching Company Admin sections

Existing section IDs, handlers and permissions must remain unchanged.

## Sidebar Parent Row

Each parent row should support:

- existing icon or module visual
- module title
- expansion chevron
- open/closed state
- hover state
- keyboard focus state
- active/open styling

Badges may only be shown if backed by real existing data.

## Sidebar Child Navigation

Child navigation must:

- remain compact
- use consistent indentation
- clearly distinguish active and inactive states
- support long modules such as Accounts and Logistics
- preserve existing navigation handlers
- preserve permissions

## Sidebar Scrolling

The sidebar must avoid accidental double scrolling.

Long navigation content should scroll predictably while keeping footer/profile/logout actions accessible.

## Sidebar Footer

Existing profile and logout behavior must remain unchanged.

Logout must continue to use the current authentication flow.

## Premium Visual System

### Deep Navy

Used for:

- sidebar
- strong shell surfaces
- high-emphasis navigation areas

### Electric Blue

Used for:

- active navigation
- primary buttons
- focus rings
- important interactive accents

### Soft White / Cool Grey

Used for:

- main content canvas
- cards
- neutral surfaces

### Slate / Ink

Used for:

- body text
- headings
- labels

### Semantic Colors

Success, warning and error colors remain semantic and restrained.

They must not become decorative accent colors.

## Neumorphic Direction

Use restrained premium neumorphism:

- soft outer shadows
- subtle inset highlights
- clean borders
- approximately 14–18px radii
- subtle depth
- no excessive glow
- no heavy plastic effect
- no unnecessary gradients

Important cards may use a subtle blue accent.

Routine cards remain visually neutral.

## Topbar / Header

Improve:

- Company Admin identity
- workspace title
- profile actions
- notification actions
- spacing
- alignment
- active/focus states

The header must not overlap the sidebar or content.

Sticky positioning should only be used where current layout safely supports it.

## Dashboard Cards

Company Admin-owned cards should receive:

- clearer hierarchy
- stronger metric presentation
- consistent padding
- consistent border radius
- restrained shadows
- consistent text hierarchy

Embedded module business behavior must not change.

## Tables

Company Admin-owned tables should receive:

- clearer headers
- improved row spacing
- consistent hover state
- consistent separators
- consistent status pills
- improved responsive behavior where safe

## Forms

Company Admin-owned forms should receive:

- consistent inputs
- consistent selects
- clear focus state
- clear disabled state
- clear validation/error state
- consistent action buttons

Existing validation and backend behavior must remain unchanged.

## Buttons

Primary:
- Electric Blue
- clear contrast
- hover and focus states

Secondary:
- soft neutral background
- restrained border/shadow

Destructive:
- restrained red styling

Disabled:
- visually clear and non-interactive

## Feedback States

Normalize existing Company Admin feedback where possible:

- success
- error
- warning
- info
- loading
- empty

Do not invent new business states.

## Responsive Behavior

Desktop:
- premium fixed sidebar
- stable content canvas
- no overlap

Tablet:
- controlled narrower sidebar or drawer behavior
- no content overlap

Mobile:
- drawer-style sidebar
- no horizontal clipping
- no double scroll
- important actions remain reachable

## Issue Fix Policy

Only verified Company Admin issues should be fixed.

Valid categories:

- broken navigation
- stale active state
- layout overlap
- clipping
- duplicate scrolling
- inaccessible controls
- inconsistent disabled states
- missing visible feedback
- console/runtime errors
- responsive defects

No unrelated cleanup.

## Implementation Pass 1

Sidebar and shell:

- accordion state
- one-open-at-a-time behavior
- active-parent behavior
- sidebar accessibility
- sidebar premium styling
- shell spacing
- responsive shell behavior
- top-level visual tokens

## Implementation Pass 2

Content refinement:

- cards
- tables
- forms
- buttons
- alerts
- loading states
- empty states
- responsive polish
- verified Company Admin UI/runtime fixes

## Testing Strategy

Behavior changes must follow TDD.

Sidebar tests must prove:

- only one module stays expanded
- opening another module collapses the previous module
- active child keeps parent expanded
- active navigation remains visible
- existing navigation handlers remain intact
- logout remains available
- permissions are not widened

Regression verification must include:

- Company Admin Accounts navigation tests
- Company Admin Logistics routing tests
- Accounts frontend regression
- Angular build

Additional tests should be added for new Company Admin behavior.

## Browser Verification

Manual verification should cover:

- expand/collapse behavior
- active child highlighting
- long module navigation
- sidebar scrolling
- profile/logout access
- desktop layout
- tablet layout
- mobile behavior
- cards
- tables
- forms
- feedback states
- browser console errors

## Git Safety

Repository is shared by multiple developers.

Rules:

- work only on feature branch
- fetch before integration
- inspect divergence
- no force push
- no blind pull
- no reset
- no rebase without explicit need
- preserve unrelated untracked files
- stage only intended files
- verify tests/build before integration

The existing untracked Accounts proof upload directory must not be committed.

## Acceptance Criteria

The enhancement is complete when:

1. Only one Company Admin sidebar module can be expanded at a time.
2. Active child sections keep their parent module expanded.
3. Existing navigation IDs and flows continue working.
4. Company Admin shell uses the approved Deep Navy + Electric Blue + Soft White system.
5. Company Admin-owned cards, forms, tables, buttons and feedback states are visually consistent.
6. Desktop, tablet and mobile layouts do not introduce overlap or double-scroll defects.
7. No Sales, Logistics, Purchase, HR or Accounts business logic is unintentionally modified.
8. Existing Company Admin Accounts navigation tests pass.
9. Existing Company Admin Logistics routing tests pass.
10. Accounts frontend regression passes.
11. Angular build succeeds.
12. Verified Company Admin UI/runtime issues found during implementation are fixed or documented.
13. Git integration excludes unrelated files.
