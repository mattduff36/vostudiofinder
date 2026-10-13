# Design

Status: canonical visual reference
Last reviewed: 31 August 2026
Admin interaction contracts reviewed: October 2026

## Brand

Current primary brand colour: `#9C060B`.

The older purple palette remains in the codebase for backward compatibility but is not the default brand colour for new work.

## Design sources

- `src/lib/theme.ts` — primary colours and z-index scale
- `tailwind.config.ts` — Tailwind brand/legacy palettes and breakpoints
- `src/app/globals.css` — global typography/forms/legacy styling
- `src/config/navigation.ts` — navigation content/visibility
- Existing approved production surfaces — implementation evidence for layout/interaction conventions

## Layout and responsive behaviour

- Design mobile first.
- Preserve touch-safe controls and mobile form font sizing.
- The custom `desktop` breakpoint is currently 1080px for navigation behaviour.
- Fixed navigation, bottom navigation, drawers, modals and toasts must use coordinated stacking rather than arbitrary z-index escalation.

## Components

Prefer current project components and established composition patterns. This repo does not currently depend on shadcn/ui, Radix UI or `nuqs`; do not add them only to satisfy generic tooling rules.

## Admin studio inspection

The collapsed `/admin/studios` cards and table retain their existing density, columns, controls, colours and responsive arrangement. Clicking the non-interactive summary expands details; the existing row/card Edit action opens the editor. The expansion button is keyboard-operable with `aria-expanded` and `aria-controls`. Selection checkboxes, links, menus, switches, action buttons and selected text must not also expand/collapse the summary or open an editor.

On mobile, details appear inside the existing card. In the table, they occupy a companion row spanning the currently visible columns. Expansion is independent from bulk selection and editing. Column visibility/order, scaled table controls and horizontal scrolling remain usable; details wrap long content without widening the table. Several studios may remain expanded for comparison.

The details use the same completion items as the dashboard. Show required and optional groups, completed and outstanding states, counts and percentage. Status must be available as text to assistive technology, not colour alone. Each completion item is itself a keyboard-accessible button that opens the corresponding editor section through the shared completion routing (including the admin tab for username/email). Do not add separate Edit links beside items or an extra Edit Profile button. Include the compact admin summary and a Copy outstanding items action; when clipboard access fails, offer selectable text instead of reporting a successful copy.

Expanded details stay compact. The panel sizes itself with container queries, because the desktop table is scaled: one column on a narrow card, two columns at intermediate width, and four columns on a wide desktop (required checklist, optional checklist, account/billing, needs attention). The full description body is not shown; its completion item remains. Keep the existing text size. Do not clip the panel to a fixed height or scroll inside it, and do not let wrapped content widen the parent table.

## Admin loading, editing and feedback

- Keep the page shell, active controls and accepted rows visible during background refresh. Distinguish initial loading, refreshing, empty results and failed reads. Provide a recoverable error/retry state rather than rendering a failure as an empty list or zero statistic.
- A clean editor close must not trigger a list reload. A confirmed saved change updates its target and reconciles the active list. An unrelated earlier response must not replace a newer query, selection or target detail.
- Retain failed drafts and identify their target. Main profile Save waits for independent writes. Save, Don't Save and Cancel refer to the unsaved draft; a successful immediate privacy/image/visibility write remains saved when that draft is discarded. Pending controls and failure messages must remain understandable during close/navigation.
- Use explicit pending state to prevent duplicate destructive actions or competing writes. Confirmations name the captured record/recipient. Bulk results clear only successfully processed IDs, leaving unprocessed selections available for review.
- Support replies, campaigns and refunds show accepted, failed, uncertain and review states truthfully. A provider ID establishes acceptance, not delivery. Refund money, benefit, future-billing and notification outcomes must remain separately visible.
- Content editors preserve failed input. FAQ reordering has a keyboard alternative, treats cancelled drags as no action, and restores the accepted order on failure. Shared-note conflicts show the newer saved text while preserving the administrator's draft for a deliberate decision.

## Overlay and navigation ownership

Use `ManagedOverlay`/`Modal`/`AdminDrawer` and the shared overlay manager for dialogs, drawers, confirmations and image overlays. Portal overlays outside transformed/scaled content. The visible top overlay owns Escape, contains focus, makes background/lower overlays inert, and restores focus to a surviving opener or fallback when it closes. Confirmation Escape/backdrop means Cancel. Closing a nested cropper/viewer/confirmation must leave the parent usable and retain its scroll lock. Google autocomplete is owned by its active dialog so its popup remains selectable.

Body overflow and compatibility classes are shared resources. Do not independently clear them when one overlay closes. Fullscreen maps also use shared scroll ownership. Release a responsive overlay's registration when it stops being visible, including after a viewport change; hidden drawers or desktop-hidden navigation must not retain invisible focus/scroll locks. Exit animations retain ownership until removal.

| Surface | Drawer/navigation boundary |
|---|---|
| Payment/subscription details and error-log details | Admin drawer below 768px (`md`) |
| Suggestions/support details | Admin drawer below 1024px (`lg`), matching its split-pane layout |
| Main navigation | Existing custom 1080px `desktop` breakpoint |

Admin tabs remain real navigation links with current-page state and native modified-click behavior. Dropdown menus own focus and Escape only while open and close when their responsive mode changes. Dirty profile modals and shared notes protect ordinary navigation and browser Back with one Save/Don't Save/Cancel decision; native unload uses the browser's standard warning. Do not add a global router monkey-patch or silently discard drafts during programmatic navigation.

Sandbox controls, badge and supported preview consumers subscribe to one session state. Storage errors are visible, and unsuccessful changes must not appear accepted. Customer profile editing uses the customer's real data and eligibility rather than administrator preview overrides.

## Images

Use Next.js Image when appropriate for application content. Provide stable dimensions or `fill` + correct `sizes`. Preserve Cloudinary/remote-image constraints in `next.config.ts`.

## Visual change verification

For material UI changes, verify affected desktop/mobile layouts, keyboard/focus behaviour where interactive, modal/fixed-nav stacking and loading/error/empty states relevant to the change.

For admin changes, include the 768px, 1024px and 1080px transitions where applicable; a drawer resized while open; nested profile/cropper/viewer/confirmation focus; table scale/column changes with an expanded row; clean close versus dirty Save/Don't Save/Cancel; delayed writes and obsolete reads; and failure/retry on the selected target. Shared overlay changes also require checks on dashboard/public profile editors, navigation, image and fullscreen-map consumers. Keep fixture-based verification separate from real customer sends, syncs, refunds or other operational actions.

### Admin details at a glance

The two right columns show email verification, account creation date and age, recorded billing/renewal information, open support/refund counts, and the latest private admin note. Do not repeat owner/contact addresses, membership expiry, visibility, featured, review status or profile descriptions. Billing is local recorded evidence, not a live provider check; local records and conflicting evidence are labelled explicitly. Counts include open/in-progress issue tickets and unresolved refund actions. Notes are capped at 500 characters, previewed in three lines and editable in place. Account-specific keys in the admin-only notes table keep these separate from both the global admin note and owner-visible metadata. Saving uses optimistic concurrency and a user-row lock; stale drafts require reviewing the latest note.
