# Design

Status: canonical visual reference
Last reviewed: 31 August 2026

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

## Images

Use Next.js Image when appropriate for application content. Provide stable dimensions or `fill` + correct `sizes`. Preserve Cloudinary/remote-image constraints in `next.config.ts`.

## Visual change verification

For material UI changes, verify affected desktop/mobile layouts, keyboard/focus behaviour where interactive, modal/fixed-nav stacking and loading/error/empty states relevant to the change.
