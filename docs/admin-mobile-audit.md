# Admin Pages Mobile Audit

Quick reference for mobile pain points and solutions for each `/admin/*` page.

## Overview (`/admin`)
- **Layout**: Grid of stat cards + charts + activity feed
- **Mobile issues**: Charts may overflow, padding too large, sticky notes button crowding
- **Solution**: Stack cards, reduce padding, ensure charts are responsive
- **Status**: Mostly responsive already

## Studios (`/admin/studios`)
- **Layout**: Wide table with many columns (12+)
- **Mobile issues**: Horizontal scroll required, tiny tap targets, minWidth forces desktop
- **Solution**: Card list on mobile with key info + action buttons
- **Status**: Needs mobile card view

## Payments (`/admin/payments`)
- **Layout**: Table with expandable rows for details/refund
- **Mobile issues**: Wide table, complex refund form in expanded row
- **Solution**: List view + drawer for payment details/refund
- **Status**: Needs mobile drawer

## Payment Detail (`/admin/payments/[id]`)
- **Layout**: Desktop sidebar with refund form
- **Mobile issues**: Sidebar layout doesn't stack well
- **Solution**: Single column layout, refund in modal/drawer
- **Status**: Needs mobile layout

## Reservations (`/admin/reservations`)
- **Layout**: Table with user details
- **Mobile issues**: **Forces minWidth: 1024px** - completely broken on mobile
- **Solution**: Remove forced width, add mobile card list
- **Status**: Critical - needs immediate fix

## Support (`/admin/support`)
- **Layout**: Split view (list + detail sidebar)
- **Mobile issues**: Two-column layout doesn't work on small screens
- **Solution**: List-only on mobile, drawer for ticket details
- **Status**: Needs mobile drawer

## Error Log (`/admin/error-log`)
- **Layout**: List with expandable error details
- **Mobile issues**: Expanded details with stack traces create massive scroll
- **Solution**: Drawer for error details with scrollable code blocks
- **Status**: Needs mobile drawer

## Waitlist (`/admin/waitlist`)
- **Layout**: Table with search/export
- **Mobile issues**: Wide table for simple data
- **Solution**: Mobile card list
- **Status**: Needs mobile card view

## FAQ (`/admin/faq`)
- **Layout**: List with add button, drag-drop sorting
- **Mobile issues**: Header crowding, small touch targets
- **Solution**: Stack header, full-width button, larger touch areas
- **Status**: Needs spacing tweaks

## Audit Users (`/admin/audit/users`)
- **Layout**: 5-column summary grid + findings/suggestions
- **Mobile issues**: Grid overflow, action buttons cramped
- **Solution**: Responsive grid (1→2→5 cols), full-width mobile buttons
- **Status**: Needs responsive grid

## Analytics (`/admin/analytics`)
- **Layout**: Placeholder with coming soon message
- **Mobile issues**: Minimal, just padding
- **Solution**: Reduce mobile padding
- **Status**: Minimal work needed
