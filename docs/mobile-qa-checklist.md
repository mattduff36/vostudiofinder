# Mobile Overhaul - QA Checklist
**Version:** 1.0  
**Date:** December 16, 2025  
**Purpose:** Quick-reference testing guide for mobile overhaul

---

## Device Testing Matrix

### Required Physical Devices

| Device | Screen Size | Primary Test |
|--------|-------------|--------------|
| iPhone SE (2022) | 375x667 | Smallest modern iPhone |
| iPhone 12/13 Pro | 390x844 | Most common size |
| iPhone 14 Pro Max | 430x932 | Largest iPhone + notch |
| Samsung Galaxy S21 | 360x800 | Common Android |
| Google Pixel 7 | 412x915 | Reference Android |

### Required Browsers

- [ ] iOS Safari (latest)
- [ ] iOS Safari (iOS 16)
- [ ] Android Chrome (latest)
- [ ] Android Chrome (version -1)
- [ ] Android Firefox (latest)
- [ ] Samsung Internet (if Samsung device available)

---

## Phase 1: Navigation & Footer

### Bottom Nav Component

**Visual Checks:**
- [ ] Shows only on mobile (< 768px)
- [ ] Hidden on desktop (≥ 768px)
- [ ] 60px height
- [ ] 4 icons visible: Home, Search, Dashboard/More, Menu
- [ ] Icons properly aligned
- [ ] Labels legible (12-14px)
- [ ] Active state highlighted (red color)
- [ ] No overlap with content

**Interaction Checks:**
- [ ] All icons tappable
- [ ] Tap targets ≥ 48x48px
- [ ] Active state changes on navigation
- [ ] Home button works
- [ ] Search button works
- [ ] Dashboard button works (logged in)
- [ ] More button opens menu drawer
- [ ] No double-tap required
- [ ] Haptic feedback (iOS)

**Position Checks:**
- [ ] Fixed to bottom of viewport
- [ ] Stays visible on scroll
- [ ] Safe area padding on iPhone notch
- [ ] Doesn't overlap footer
- [ ] Z-index above content (z-50)

### Mobile Menu Drawer

**Visual Checks:**
- [ ] Slides in from right
- [ ] 80% viewport width (max 320px)
- [ ] Full height
- [ ] White background
- [ ] Backdrop dims page (50% black)
- [ ] Close button visible (top-right)
- [ ] Scrollable if content overflows

**Interaction Checks:**
- [ ] Opens when "More" tapped in bottom nav
- [ ] Closes when backdrop tapped
- [ ] Closes when X button tapped
- [ ] Closes when link tapped
- [ ] All links functional
- [ ] Logout works (logged in users)
- [ ] Smooth slide animation (300ms)
- [ ] No content jump

**Content Checks (Logged In):**
- [ ] Welcome message shows user name
- [ ] Dashboard link
- [ ] About link
- [ ] Help Centre link
- [ ] Privacy Policy link
- [ ] Terms of Service link
- [ ] Logout button (red)

**Content Checks (Logged Out):**
- [ ] Sign In link
- [ ] List Your Studio button (red)
- [ ] About link
- [ ] Help Centre link
- [ ] Privacy Policy link
- [ ] Terms of Service link

### Mobile Footer

**Collapsed State:**
- [ ] ~100px height
- [ ] Copyright text centered
- [ ] Privacy + Terms links visible
- [ ] "Show More" button centered
- [ ] Chevron down icon
- [ ] Background black
- [ ] Text white/gray

**Expanded State:**
- [ ] ~300px height
- [ ] Quick Links section
- [ ] Social icons
- [ ] Legal links
- [ ] "Show Less" button
- [ ] Chevron up icon
- [ ] Smooth transition (300ms)

**Interaction Checks:**
- [ ] "Show More" expands footer
- [ ] "Show Less" collapses footer
- [ ] All links functional
- [ ] Social icons open in new tab
- [ ] No layout shift on expand/collapse

### Desktop Regression (Phase 1)

**Navigation:**
- [ ] Top nav horizontal layout unchanged
- [ ] Logo position unchanged
- [ ] Desktop menu items visible
- [ ] Auth buttons position unchanged
- [ ] Hover states work
- [ ] NO bottom nav visible

**Footer:**
- [ ] Full 4-column grid
- [ ] Company info section (2 cols)
- [ ] Quick Links column
- [ ] Resources column
- [ ] Social media row
- [ ] Legal footer row
- [ ] NO collapsed state
- [ ] Height ~400-500px

---

## Phase 2: Studios Page

### Filter Drawer (Mobile)

**Visual Checks:**
- [ ] Slides up from bottom
- [ ] 75% viewport height
- [ ] Rounded top corners (16px)
- [ ] Drag handle visible (top center)
- [ ] Header with "Filters" title
- [ ] Close button (top-right)
- [ ] Scrollable content area
- [ ] Sticky footer with buttons
- [ ] Backdrop visible (50% black)

**Interaction Checks:**
- [ ] Opens when "Filters" button tapped
- [ ] Swipe down on drag handle to dismiss
- [ ] Swipe down 100px+ dismisses
- [ ] Backdrop tap dismisses
- [ ] Close button dismisses
- [ ] "Cancel" button dismisses
- [ ] "Apply" button applies filters and closes
- [ ] Smooth slide animation (300ms)

**Content Checks:**
- [ ] Location input visible
- [ ] Radius slider functional
- [ ] Studio Type checkboxes visible (RED)
- [ ] Sort options visible
- [ ] All controls tappable
- [ ] Form validation works

**NOT on Mobile:**
- [ ] NO full-screen modal
- [ ] NO Apply button in top bar
- [ ] Content scrollable within drawer

### Collapsible Map (Mobile)

**Collapsed State:**
- [ ] 60px height bar
- [ ] "Show Map" text
- [ ] Studio count visible
- [ ] Chevron down icon
- [ ] Tappable area full width
- [ ] Light gray background

**Expanded State:**
- [ ] 240px map height
- [ ] Google Map renders
- [ ] Markers visible
- [ ] Markers clickable
- [ ] Controls bar below map
- [ ] "Minimize Map" button
- [ ] "Full Screen" button
- [ ] Smooth expand animation

**Interaction Checks:**
- [ ] Tap bar to expand
- [ ] Tap "Minimize" to collapse
- [ ] Map interactive when expanded
- [ ] Zoom controls work
- [ ] Pan works
- [ ] Markers open bottom sheet (future)
- [ ] No content jump on expand/collapse

### Studio Cards (Mobile)

**Visual Checks:**
- [ ] Full width (minus 16px padding)
- [ ] Single column layout
- [ ] Image 16:9 aspect ratio
- [ ] ~200px image height
- [ ] Studio name visible (16px font)
- [ ] Location visible
- [ ] Type badges visible
- [ ] Rating visible (if available)
- [ ] Avatar visible
- [ ] Verified badge (if applicable)

**Interaction Checks:**
- [ ] Tap card navigates to profile
- [ ] Image loads progressively
- [ ] Placeholder shown while loading
- [ ] Lazy loading below fold
- [ ] No layout shift on image load

### Mobile Controls Bar

**Visual Checks:**
- [ ] Sticky below top nav
- [ ] "Filters" button full width
- [ ] Filter count badge (if active)
- [ ] Collapsible map below
- [ ] Clean separation

**Interaction Checks:**
- [ ] Filters button opens drawer
- [ ] Badge shows correct count
- [ ] Stays visible on scroll

### Desktop Regression (Phase 2)

**Layout:**
- [ ] Sidebar visible (left side)
- [ ] Filters in sidebar (NOT drawer)
- [ ] Map full height (400px)
- [ ] 3-column studio grid
- [ ] Selected studio card in sidebar
- [ ] NO mobile controls bar
- [ ] NO collapsible map

**Functionality:**
- [ ] Filter apply immediate
- [ ] Map always visible
- [ ] Grid responsive
- [ ] All interactions unchanged

---

## Phase 3: Profile Pages

### Compact Hero (Mobile)

**Visual Checks:**
- [ ] 120px total height (vs 256px desktop)
- [ ] Avatar 80x80px (vs 120x120px desktop)
- [ ] Avatar bottom-left position
- [ ] Name overlay on image
- [ ] White text with shadow
- [ ] Verified badge visible
- [ ] Background image responsive

**Interaction Checks:**
- [ ] Avatar tappable
- [ ] Name readable
- [ ] No text overflow

### Contact Bar (Mobile)

**Visual Checks:**
- [ ] Fixed to bottom
- [ ] 60px height
- [ ] White background
- [ ] Shadow above
- [ ] Message button (primary)
- [ ] Call button (secondary)
- [ ] Menu button (⋯)

**Interaction Checks:**
- [ ] Message button opens form
- [ ] Call button opens dialer
- [ ] Menu button opens options
- [ ] Slides up on scroll down
- [ ] Slides down on scroll up
- [ ] Smooth slide animation (200ms)
- [ ] Doesn't overlap bottom nav

### Image Gallery (Mobile)

**Visual Checks:**
- [ ] Horizontal scroll
- [ ] Images square or 16:9
- [ ] Count indicator (1 / 12)
- [ ] Smooth scroll
- [ ] No pagination dots

**Interaction Checks:**
- [ ] Swipe left/right works
- [ ] Tap image opens lightbox
- [ ] Lightbox swipeable
- [ ] Lightbox close button
- [ ] Pinch to zoom works (lightbox)

### About Section (Mobile)

**Visual Checks:**
- [ ] Shows 3 lines initially
- [ ] "Read More" button visible
- [ ] Ellipsis on truncated text

**Interaction Checks:**
- [ ] "Read More" expands inline
- [ ] Full text visible when expanded
- [ ] "Read Less" button appears
- [ ] Smooth expand animation
- [ ] No layout jump

### Desktop Regression (Phase 3)

**Hero:**
- [ ] 256px height
- [ ] Avatar 120x120px
- [ ] Grid layout (2-column)
- [ ] NO contact bar at bottom
- [ ] CTA buttons inline

**Layout:**
- [ ] Full-width sections
- [ ] Desktop spacing
- [ ] NO mobile compact variants

---

## Phase 4: Dashboard

### Stats Grid (Mobile)

**Visual Checks:**
- [ ] 2x2 grid (vs 4-column desktop)
- [ ] Each card 48px height min
- [ ] Icon visible
- [ ] Number large (24px)
- [ ] Label small (12px)
- [ ] Cards tappable

**Interaction Checks:**
- [ ] Tap card navigates to section
- [ ] Active state on tap
- [ ] No double-tap required

### Task Cards (Mobile)

**Visual Checks:**
- [ ] Full-width cards
- [ ] Vertical stack (NOT tabs)
- [ ] Card title (16px font)
- [ ] Description visible
- [ ] Arrow icon (right)
- [ ] Badge for counts (unread, pending)

**Interaction Checks:**
- [ ] Tap card navigates
- [ ] Smooth navigation
- [ ] Back button returns to dashboard

### Visibility Toggle (Mobile)

**Visual Checks:**
- [ ] Sticky below top nav
- [ ] Label: "Profile Visible:"
- [ ] Toggle switch (ON/OFF)
- [ ] Clear visual state

**Interaction Checks:**
- [ ] Toggle switches instantly
- [ ] Auto-saves on change
- [ ] Confirmation toast shows
- [ ] State persists on reload

### Desktop Regression (Phase 4)

**Layout:**
- [ ] 4-column stats grid
- [ ] Horizontal tabs
- [ ] Sidebar navigation
- [ ] Full-width content
- [ ] NO task cards

---

## Cross-Device Tests (All Phases)

### Layout Tests

**360px Width:**
- [ ] No horizontal scroll
- [ ] All content visible
- [ ] Text readable (16px min)
- [ ] Buttons tappable
- [ ] Images scale correctly

**375px Width:**
- [ ] Optimal layout
- [ ] No cramped elements
- [ ] Good spacing

**390px Width:**
- [ ] Enhanced layout
- [ ] More breathing room

**412px Width:**
- [ ] Comfortable reading
- [ ] Well-spaced elements

**430px Width:**
- [ ] Maximum mobile width
- [ ] No excessive whitespace
- [ ] Content centered

### Orientation Tests

**Portrait (Primary):**
- [ ] All features work
- [ ] Optimal layout
- [ ] Thumb reach OK

**Landscape (Secondary):**
- [ ] Content doesn't break
- [ ] Nav still accessible
- [ ] Forms usable
- [ ] Map works

### Performance Tests

**Page Load (3G Connection):**
- [ ] First Contentful Paint < 2.5s
- [ ] Largest Contentful Paint < 3.5s
- [ ] Time to Interactive < 4.5s
- [ ] Cumulative Layout Shift < 0.1

**Scroll Performance:**
- [ ] 60fps scroll (no jank)
- [ ] Lazy loading works
- [ ] Images load progressively
- [ ] Infinite scroll smooth

**Interaction Latency:**
- [ ] Tap feedback < 100ms
- [ ] Navigation < 300ms
- [ ] Filter apply < 500ms
- [ ] Form submit < 1s

### Accessibility Tests

**Screen Reader:**
- [ ] VoiceOver (iOS) announces all elements
- [ ] TalkBack (Android) announces all elements
- [ ] ARIA labels present
- [ ] Headings hierarchical
- [ ] Landmarks defined
- [ ] Alt text on images

**Keyboard Navigation:**
- [ ] All elements focusable
- [ ] Tab order logical
- [ ] Focus visible (outline)
- [ ] No keyboard traps
- [ ] Skip links work

**Color Contrast:**
- [ ] Text on backgrounds: 4.5:1 min
- [ ] Icons: 3:1 min
- [ ] Disabled states: 3:1 min
- [ ] Error states distinct
- [ ] WCAG AA compliance

**Touch Targets:**
- [ ] All targets 44x44px min (Apple)
- [ ] All targets 48x48px preferred (Material)
- [ ] Spacing between targets 8px min
- [ ] Hit areas generous

### Edge Cases

**Slow Network (3G):**
- [ ] Loading skeletons show
- [ ] Progressive rendering
- [ ] Error handling graceful
- [ ] Retry mechanism

**Offline:**
- [ ] Graceful degradation
- [ ] Cached content shows
- [ ] Error message helpful
- [ ] Retry when back online

**Empty States:**
- [ ] No studios found
- [ ] No messages
- [ ] No connections
- [ ] Clear CTA

**Error States:**
- [ ] Network error toast
- [ ] Server error message
- [ ] Validation errors inline
- [ ] Permission denied

---

## Desktop Regression (Every Phase)

### Homepage

- [ ] Hero layout unchanged
- [ ] Search bar max-width 896px
- [ ] Featured studios 6-card grid
- [ ] Footer 4-column layout
- [ ] All spacing identical

### Studios Page

- [ ] Sidebar visible (left)
- [ ] Filters in sidebar
- [ ] Map 400px height
- [ ] 3-column grid
- [ ] Selected studio card works
- [ ] Load more button

### Profile Pages

- [ ] Hero 256px height
- [ ] Avatar 120x120px
- [ ] 2-column grid layout
- [ ] Inline CTAs
- [ ] Desktop spacing

### Dashboard

- [ ] 4-column stats grid
- [ ] Horizontal tabs
- [ ] Sidebar navigation
- [ ] Full forms
- [ ] Desktop density

### Navigation

- [ ] Top nav horizontal
- [ ] Desktop links visible
- [ ] Auth buttons positioned
- [ ] Hover states work
- [ ] NO bottom nav

### Footer

- [ ] 4-column grid
- [ ] Full content
- [ ] Legal footer row
- [ ] Social media
- [ ] Height ~400-500px

---

## Quick Test Script (5 minutes per device)

### Script A: Homepage & Search

1. **Open homepage on mobile**
   - [ ] Bottom nav visible
   - [ ] Footer collapsed
   - [ ] Search bar functional

2. **Enter location and search**
   - [ ] Navigate to /studios
   - [ ] Filter button visible
   - [ ] Map collapsed

3. **Open filters**
   - [ ] Drawer slides up
   - [ ] All controls accessible
   - [ ] Apply button works

4. **Browse results**
   - [ ] Cards display correctly
   - [ ] Tap card → navigate to profile
   - [ ] Back button returns to results

### Script B: Profile & Dashboard

1. **View studio profile**
   - [ ] Compact hero shows
   - [ ] Contact bar at bottom
   - [ ] Image gallery swipeable

2. **Navigate to dashboard** (logged in)
   - [ ] Bottom nav highlights
   - [ ] Stats in 2x2 grid
   - [ ] Task cards work

3. **Check menu drawer**
   - [ ] Tap "More" in bottom nav
   - [ ] Drawer opens
   - [ ] All links work
   - [ ] Logout works

### Script C: Desktop Check

1. **Open homepage on desktop (1920x1080)**
   - [ ] NO bottom nav
   - [ ] Full footer
   - [ ] Hero unchanged

2. **Check /studios page**
   - [ ] Sidebar visible
   - [ ] Map full height
   - [ ] 3-column grid

3. **Verify navigation**
   - [ ] Top nav horizontal
   - [ ] Links visible
   - [ ] Hover states work

---

## Sign-Off Checklist

### Before Merging PR

- [ ] All mobile device tests passed
- [ ] All browser tests passed
- [ ] Desktop regression tests passed
- [ ] Lighthouse mobile score ≥ 85
- [ ] No console errors
- [ ] No accessibility violations
- [ ] Performance metrics met
- [ ] QA sign-off obtained
- [ ] Product owner approval

### Before Production Deploy

- [ ] Feature flag ready
- [ ] Monitoring dashboards set up
- [ ] Analytics events firing
- [ ] Error tracking configured
- [ ] Rollback plan documented
- [ ] Support team briefed
- [ ] Help docs updated
- [ ] Change log updated

---

## Bug Report Template

```markdown
**Device:** iPhone 13 Pro (390x844)
**Browser:** iOS Safari 17.1
**Phase:** Phase 2 - Studios Page
**Severity:** High / Medium / Low

**Steps to Reproduce:**
1. Navigate to /studios
2. Tap "Filters" button
3. Change location to "London"
4. Tap "Apply"

**Expected Behavior:**
Filter drawer closes and search updates

**Actual Behavior:**
Filter drawer stays open, search doesn't update

**Screenshots:**
[Attach screenshots]

**Console Errors:**
[Attach console logs]

**Additional Context:**
Only happens on iOS Safari, works fine on Android Chrome
```

---

## Performance Metrics Reference

### Target Metrics

| Metric | Target | Current (Baseline) |
|--------|--------|--------------------|
| Mobile Bounce Rate | < 45% | ~65% |
| Time on Site (Mobile) | +40% | 2m 15s → 3m 9s |
| Pages/Session (Mobile) | +50% | 2.1 → 3.2 |
| Scroll Depth Reduction | -40% | Varies by page |
| Search → Profile View | +35% | 45% → 61% |
| Profile → Contact | +50% | 12% → 18% |
| Sign-up Completion | +60% | 18% → 29% |

### Lighthouse Targets

- Performance: ≥ 85
- Accessibility: ≥ 95
- Best Practices: ≥ 90
- SEO: ≥ 95

---

**END OF QA CHECKLIST**

Use this checklist for every PR in the mobile overhaul project. Check off items as you test. Report any failures immediately.
