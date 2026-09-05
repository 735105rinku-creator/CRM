# Logistics Table Actions Standardization Design

## Objective

Standardize every applicable Logistics list table on the same compact action pattern:

`[ View ] [ Edit ] [ More ]`

The change must preserve existing routes, API methods, record identifiers, permission rules, tenant isolation, and the current uncommitted Logistics baseline.

## Shared Component

Create a standalone `LogisticsTableActionsComponent` under the Logistics shared UI area. It owns presentation and menu interaction only; feature components continue to own navigation, API calls, confirmations, downloads, printing, status changes, and business rules.

Inputs:

- Stable row ID used to associate a menu with its record.
- Whether View and Edit are visible and enabled.
- A list of visible secondary actions containing a stable action key, label, optional danger state, and disabled state.
- Accessible label identifying the row when useful.

Outputs:

- `view`: emits the stable row ID.
- `edit`: emits the stable row ID.
- `secondaryAction`: emits the stable row ID and selected action key.

The feature template resolves the emitted row ID back to its existing row object before calling the existing handler. This prevents stale loop-variable and wrong-record behavior.

## Menu Behavior

Use Angular CDK Overlay for the More menu. The overlay is attached to the triggering button but rendered outside table overflow containers.

Required behavior:

- One menu open at a time.
- Row-ID-controlled open state.
- Close on action selection, outside click, Escape, route/component destruction, scroll strategy, or a replacement row opening.
- Connected-position fallback keeps the menu within the viewport.
- Overlay z-index is consistent throughout Logistics.
- No native `details` or `summary` menus.

## Visual Contract

The shared component supplies all button and menu styling:

- 36px square buttons.
- Compact 6px spacing.
- Consistent rounded corners.
- Existing light neumorphic surfaces and inset/raised states.
- Clear hover, pressed, focus-visible, and disabled states.
- Native `title` plus accessible labels for View, Edit, and More.
- Eye icon for View, pencil icon for Edit, vertical ellipsis for More.
- Delete is displayed as a danger menu item rather than a primary icon.

Feature styles may position the action group within a cell, but may not redefine button dimensions or interaction states.

## Permission Contract

The shared component never grants permissions. Each owning feature supplies only actions already allowed by its resolved frontend permission state. Existing backend middleware remains authoritative.

- View and Edit controls are hidden when the corresponding action is not allowed.
- Delete is included in secondary actions only when delete permission is allowed.
- Unsupported actions are omitted rather than connected to placeholder handlers.
- Existing confirmation prompts remain in feature handlers for destructive actions.

If a feature currently lacks a safe frontend permission signal, the migration preserves its current visibility behavior and relies on the existing backend authorization; it must not broaden access.

## Module Migration

- Air Cargo: retain View and Edit; move Duplicate, receipt upload where representable, AWB details, invoice generation, status update, and permitted delete into More. Preserve upload behavior safely if a file control cannot be represented by the initial action model.
- Sea Freight: View and Edit are primary; existing status/delete/secondary behavior moves to More where supported.
- Tracking: apply only to row-level shipment/history actions; keep form and timeline controls outside this pattern.
- Documents: View/preview and metadata Edit are primary; Download and permitted Delete are secondary.
- CHA Master and Clearance: View and Edit are primary; status changes and permitted Delete are secondary.
- Transporters: View and Edit are primary; permitted Delete is secondary.
- Warehouse Master: View and Edit are primary; activate/deactivate and permitted Delete are secondary. Warehouse receipt status transitions are secondary row actions.
- Customers, Vendors, Products & Services: View and Edit are primary; permitted Delete is secondary.
- Vendor Payments: View and Edit are primary where current handlers exist; payment-specific status/download/delete actions are secondary.
- Invoices: View and Edit are primary; print/download/status/permitted delete actions are secondary where current handlers exist.
- Reports: migrate only genuine row-action tables. Global report generation and export controls remain normal page actions.

## Error and Identifier Handling

- Rows without a stable backend ID disable relevant actions.
- The shared output always includes the row ID.
- Feature components retain meaningful API error handling.
- No fallback, fake, index-based, or display-code ID may be sent to backend routes that require MongoDB IDs.

## Testing

Add regression coverage before production changes for:

- Shared component icon labels and 36px visual contract.
- Row-ID emission for View, Edit, and secondary actions.
- One-menu-at-a-time state.
- CDK overlay usage and absence of native `details` menus.
- Escape/outside-click closure.
- Danger and disabled menu actions.
- Each applicable Logistics list importing and rendering the shared component.
- Existing handlers remaining connected to their original API method and backend ID.
- Delete visibility retaining permission checks where available.

Run all Logistics backend/frontend regressions, action-handler source contracts, Angular production build, and backend syntax checks.

## Exclusions

- No backend architecture changes.
- No MongoDB operations, migrations, seeds, resets, or indexes.
- No Driver changes.
- No unrelated CRM, Sales, Accounts, HR, or Employee changes.
- No invented row actions where backend or safe local support does not exist.
