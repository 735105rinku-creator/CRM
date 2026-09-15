# OPAS BIZZ Premium Enterprise Shell & Theme System

**Date:** 14 September 2026
**Status:** Approved Design
**Scope:** Shared authenticated frontend shell and theme system

---

## 1. Objective

Create a consistent premium enterprise UI across authenticated OPAS BIZZ modules while preserving all existing business logic, routing, permissions, data flow, and department ownership boundaries.

The redesign replaces the fragmented visual language with one shared premium enterprise shell.

Primary direction:

- Midnight Navy
- Royal Blue
- Soft White
- Slate
- Emerald status accents
- restrained shadows
- clean spacing
- premium SaaS typography hierarchy
- minimal gradients
- no excessive neumorphism or glow

---

## 2. Modules Covered

- Company Admin
- Accounts
- Sales
- Purchase
- Logistics
- HR
- Employee workspace

Business-specific screens remain owned by their existing modules.

No business logic, permission, route, API, repository, service, or database behavior will be redesigned as part of the visual system.

---

## 3. Shared Enterprise Shell

The authenticated application shell will provide:

1. Shared top navbar
2. Module-specific sidebar
3. Main content canvas
4. Shared semantic theme tokens
5. Shared profile/user actions
6. Shared notification entry point
7. Shared responsive behavior

The shell must provide visual consistency without coupling module business behavior.

---

## 4. Shared Top Navbar

The navbar will use the same structural language across authenticated modules.

Recommended contents:

- OPAS BIZZ logo / brand
- current module name
- optional global search
- workspace/module switcher
- notifications
- theme control
- user avatar
- profile menu
- settings shortcut
- logout access where appropriate

The navbar will be sticky, restrained, and visually lighter than the sidebar.

It must not bypass existing guards or introduce new permissions.

---

## 5. Sidebar

Default sidebar design:

- Midnight Navy base
- deep slate secondary surface
- Royal Blue active state
- cool slate inactive text
- muted uppercase group labels
- compact professional spacing
- restrained hover state
- subtle separators
- nearly invisible scrollbar
- logout at bottom

Company Admin keeps its one-open-at-a-time accordion behavior.

Other modules preserve their existing navigation hierarchy while adopting shared visual tokens.

---

## 6. Default Premium Palette

- Midnight: #0B1324
- Navy Surface: #121E33
- Royal Blue: #2563EB
- Electric Blue: #3B82F6
- Canvas: #F5F7FB
- Surface: #FFFFFF
- Primary Text: #172033
- Muted Text: #64748B
- Border: #E2E8F0
- Success: #10B981
- Warning: #F59E0B
- Danger: #EF4444

The default premium theme must not use the current olive/brown Company Admin financial hero treatment.

---

## 7. Main Content Canvas

- soft neutral canvas
- controlled content width where appropriate
- 24-32px section rhythm
- clear page hierarchy
- no oversized decorative hero cards
- no giant empty gaps
- border-first visual hierarchy
- restrained shadows

---

## 8. Cards, Buttons, Forms and Tables

Cards:

- 16-18px radius
- subtle 1px border
- soft shadow
- consistent padding
- strong title/subtitle hierarchy
- no deep inset shadows
- no excessive glow

Buttons:

- Primary: Royal Blue filled
- Secondary: white/slate bordered
- Tertiary: ghost/text
- Destructive: red only for destructive actions

Forms:

- 44-46px controls
- clean borders
- visible focus state
- labels above fields
- no inset neumorphism
- existing Other -> custom input behavior preserved

Tables:

- white/theme surface
- muted header strip
- readable row spacing
- subtle row hover
- status pills
- compact actions
- sticky header where useful
- horizontal scrolling only where genuinely necessary

---

## 9. Company Admin Overview

Company Admin Overview will use the shared premium shell and be visually organized as:

1. Shared navbar
2. Compact page header
3. Owner Command Center
4. KPI summary
5. Financial health
6. Cash and bank
7. Receivables and payables
8. Operational module summaries

The existing Owner Command Center business logic, data sources, APIs, permissions, and routing remain unchanged.

The current olive/brown visual treatment must be replaced by the shared premium palette.

Company Admin overview surfaces should use white/theme surfaces, slate text, Royal Blue emphasis, and semantic status colors.

---

## 10. Theme Settings

Company Settings -> Theme Settings becomes the central theme control surface for the premium enterprise shell.

Theme Settings must support:

- Light mode
- Dark mode
- System mode
- Premium preset selection
- Primary color
- Accent color
- Sidebar appearance
- Navbar appearance
- Radius profile
- Density profile
- Live preview
- Save Theme
- Reset Theme

Existing theme persistence/storage should be reused where possible.

A duplicate theme system must not be introduced if the repository already has a working theme settings flow.

---

## 11. Premium Presets

Initial approved presets:

### Midnight Executive

Default OPAS BIZZ premium theme.

Primary characteristics:

- Midnight Navy shell
- Royal Blue actions
- soft white surfaces
- slate text
- restrained Emerald status accents

### Graphite Pro

Charcoal / graphite shell with cobalt-blue accents.

### Royal Slate

Lighter corporate slate shell with Royal Blue accents.

### Emerald Navy

Midnight Navy foundation with restrained Emerald accent treatment.

Curated presets are the primary experience.

Optional custom primary/accent colors may be offered without allowing unrestricted styling that breaks readability or product consistency.

---

## 12. Reset Theme

Theme Settings must include a clearly visible Reset to OPAS BIZZ Default action.

Reset flow:

1. User clicks Reset Theme.
2. Confirmation modal appears.
3. Midnight Executive defaults are loaded into live preview.
4. User can review the reset result before saving.
5. Permanent application occurs only after Save Theme.
6. Reset must never modify business data, permissions, routes, or module settings unrelated to theme.

The reset target is always the approved OPAS BIZZ Midnight Executive default.

---

## 13. Theme Token Strategy

The shell and shared visual primitives must consume semantic theme tokens instead of scattered hard-coded module colors.

Token categories:

- shell background
- navbar background
- sidebar background
- primary
- accent
- canvas
- surface
- primary text
- muted text
- border
- success
- warning
- danger
- radius
- density
- shadow

Module-specific views may extend the token system where necessary but should not redefine the shared base unnecessarily.

---

## 14. Dark Mode

Dark mode must be a genuine theme state, not a simple color inversion.

It must preserve:

- readable contrast
- semantic status colors
- readable tables
- readable forms
- clear boundaries
- premium hierarchy
- restrained shadows

Dark mode work must not change business behavior.

---

## 15. Responsive Design

Target widths:

- 1280px and above
- 1024px
- 768px
- 390px

Desktop behavior:

- persistent sidebar
- sticky shared navbar
- full module context
- controlled content width

Tablet and mobile behavior:

- collapsible navigation
- compact navbar
- readable forms and tables
- no horizontal page scrolling
- content remains vertically scrollable

---

## 16. Accessibility

Required accessibility behavior:

- keyboard-visible focus states
- correct button semantics
- aria-expanded for expandable navigation
- sufficient contrast
- usable touch target sizes
- no color-only status meaning
- readable form validation states

---

## 17. Module Ownership Boundaries

The redesign must not rewrite feature business logic inside:

- Sales
- Logistics
- Purchase
- Accounts
- HR

Only the smallest shared-shell or theme integration changes are allowed where strictly necessary.

The following must remain intact:

- routes
- guards
- permissions
- API contracts
- services
- repositories
- database behavior
- department workflow rules

No database migration, seed, reset, delete, or destructive data operation is permitted.

---

## 18. Rollout Strategy

Implementation will be phased:

### Phase 1 - Theme Foundation

- shared semantic theme tokens
- premium default palette
- light/dark/system theme state foundation

### Phase 2 - Shared Navbar and Shell

- common top navbar
- shared shell primitives
- module-aware title/context
- profile, notifications, and theme entry points

### Phase 3 - Company Admin Premium Conversion

- sidebar refinement
- page header
- cards and panels
- Owner Command Center visual conversion
- forms and tables

### Phase 4 - Theme Settings

- presets
- live preview
- save behavior
- Reset to OPAS BIZZ Default
- reuse existing persistence where possible

### Phase 5 - Module Adoption

- Accounts
- Sales
- Purchase
- Logistics
- HR
- Employee workspace

Adoption must be visual and shell-focused only.

### Phase 6 - Responsive and Visual Audit

- 1280px
- 1024px
- 768px
- 390px

---

## 19. Testing Strategy

Every implementation phase must include:

- targeted TDD tests
- Company Admin regression
- Accounts regression
- affected-module regression
- Angular production build
- git diff --check

Shared shell changes must not weaken guards, permissions, routes, or module-specific tests.

---

## 20. Success Criteria

The redesign is successful when:

- authenticated modules visibly belong to one OPAS BIZZ product
- Company Admin looks professional and premium
- Owner Command Center follows the shared premium palette
- shared navbar language is consistent across modules
- module sidebars remain functionally intact
- Theme Settings controls the shell consistently
- Reset Theme restores Midnight Executive defaults
- dark mode remains readable and professional
- responsive layouts avoid horizontal page scrolling
- existing business workflows remain unchanged
- production build passes
- existing regression suites remain green
