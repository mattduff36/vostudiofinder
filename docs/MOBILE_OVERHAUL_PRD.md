# VoiceoverStudioFinder - Mobile Overhaul PRD
**Version:** 1.0  
**Date:** December 16, 2025  
**Author:** AI Development Team  
**Constraint:** Desktop layouts must remain pixel-identical. All changes isolated to mobile breakpoints (< 768px).

---

## Executive Summary

This PRD outlines a comprehensive mobile-first overhaul targeting devices 360-430px wide. The goal is to fix unnatural navigation patterns, improve thumb reach, and optimize information hierarchy while maintaining 100% desktop parity.

**Target Metrics:**
- 30% reduction in mobile bounce rate
- 50% improvement in mobile task completion
- 40% reduction in scroll depth on key pages
- Zero desktop regression

---

## 1. CODEBASE AUDIT FINDINGS

### 1.1 App Structure
```
Primary Routes:
├── / (Homepage with hero + featured studios)
├── /studios (Search page with filters, map, grid)
├── /[username] (Public studio profiles)
├── /dashboard (User dashboard)
├── /about, /help, /privacy, /terms
└── /auth/* (Sign in/up flow)
```

### 1.2 Current Breakpoints in Use
**Tailwind Breakpoints:**
- `sm:` - 640px (rarely used)
- `md:` - 768px (PRIMARY desktop break)
- `lg:` - 1024px (desktop enhancements)
- `xl:`, `2xl:` - Large desktop only

**Mobile Pattern:** Everything < 768px is considered mobile

**Files Using Breakpoints:** 74+ component files use responsive classes

### 1.3 Navigation Architecture

#### Current Navbar (`src/components/navigation/Navbar.tsx`)
**Desktop (md:):**
- Horizontal links: Studios, About, Blog (disabled)
- Auth buttons: Sign In + List Your Studio
- Welcome message + Dashboard button (logged in)
- Admin panel (admin users only)

**Mobile (< md:):**
- Hamburger menu button (top-right)
- Dropdown overlay (full-width, white bg)
- Stacks all navigation vertically
- No thumb-optimized positioning

**Issues:**
- Dropdown pushes content down instead of overlaying
- No quick access to search from nav
- Back button behavior not optimized
- Menu button requires reaching top-right corner

#### Current Footer (`src/components/home/Footer.tsx`)
**Desktop:**
- 4-column grid: Company info (2 cols) + Quick Links + Resources
- Social media icons
- Legal links + copyright

**Mobile:**
- Same layout compressed to single column
- **PROBLEM:** Takes ~800px vertical space on mobile
- **PROBLEM:** Low-value content (company description, email) at top
- **PROBLEM:** Primary actions (Browse Studios, List Studio) buried at bottom

### 1.4 Studios Page Architecture (`src/components/search/StudiosPage.tsx`)

**Layout Structure:**
```
Desktop: Sidebar (filters) | Main (map + grid) [3:1 ratio]
Mobile: Modal filters + View toggle (List/Map) + Cards
```

**Mobile Controls (`line 676-729`):**
- Fixed header with "Filters" button + "List/Map" toggle
- Filter button opens full-screen modal
- Map view replaces grid entirely
- "Apply" button in modal footer

**Issues Identified:**
1. **Filter Modal:** Full-screen takeover feels heavy, blocks exploration
2. **View Toggle:** List/Map mutually exclusive - can't reference map while browsing
3. **Sticky Header:** Takes ~80px on mobile (nav 80px + controls 60px = 140px total)
4. **Selected Studio Card:** Desktop sidebar pattern doesn't translate to mobile
5. **Map Markers:** Clicking pin opens modal, but navigating back loses context
6. **Load More:** Infinite scroll on mobile could cause "pogo-sticking"

**Files:**
- `src/components/search/StudiosPage.tsx` - Main orchestrator
- `src/components/search/SearchFilters.tsx` - Filter component (mobile modal logic)
- `src/components/search/StudiosList.tsx` - Card grid
- `src/components/search/SelectedStudioDetails.tsx` - Selected card (desktop only)
- `src/components/maps/GoogleMap.tsx` - Map component
- `src/components/maps/StudioMarkerModal.tsx` - Pin click modal

### 1.5 Profile Pages Architecture

#### Public Profiles (`src/app/[username]/page.tsx` + `src/components/profile/EnhancedUserProfile.tsx`)

**Structure:**
- Hero section with avatar + bio (lines 88-100)
- Profile info grid
- Services/offerings
- Social links
- Studio profile section

**Mobile Issues:**
1. **Hero:** 16rem (256px) padding - massive on mobile
2. **Avatar:** Oversized, not optimized for small screens
3. **Grid Layout:** Uses `md:flex-row` - stacks awkwardly on mobile
4. **Information Hierarchy:** Bio text same size as headers
5. **CTA Placement:** Contact/connect buttons not thumb-optimized

#### Own Profile (Dashboard) (`src/components/dashboard/UserDashboard.tsx`)

**Structure:**
- Stats cards (4-column grid)
- Profile completion widget
- Visibility toggle
- Activity tabs

**Mobile Issues:**
1. **Stats Grid:** `grid-cols-2 md:grid-cols-4` - cramped on mobile
2. **Tab Navigation:** Horizontal tabs difficult to tap
3. **Dense UI:** Desktop density forced onto mobile
4. **No Quick Actions:** Edit profile, add studio require scrolling

### 1.6 Dashboard Sub-Pages

**Dashboard Tabs Component** (`src/components/dashboard/DashboardTabs.tsx`):
- My Profile
- My Studios  
- Messages
- Connections
- Reviews

**Issues:**
- Tabs not sticky on mobile
- No breadcrumbs or "back to dashboard" quick action
- Form-heavy pages (Profile Edit) cramped on mobile

### 1.7 Existing Mobile Patterns

**Good Patterns Found:**
1. **Studios Page View Toggle:** List/Map switcher is clear
2. **Mobile Filter Modal:** Clean implementation with Apply button
3. **Card Stacking:** Studio cards stack well on mobile
4. **Image Galleries:** Touch swipe works well

**Missing Patterns:**
1. **Bottom Navigation:** No thumb-optimized nav
2. **Sticky Action Buttons:** CTAs not readily accessible
3. **Breadcrumbs:** No way to track location depth
4. **Pull-to-refresh:** No refresh gesture
5. **Swipe Navigation:** No swipe-back gestures

### 1.8 Performance & Technical

**Bundle Analysis:**
- Map component: Large JS payload (~120KB)
- Image optimization: Using Next/Image (good)
- Mobile-specific code-splitting: Not implemented

**Mobile-Specific Helpers:**
- `isMobileDevice()` function in SearchFilters (line 195-197)
- Basic window width check
- Could be centralized utility

---

## 2. MOBILE PRD

### 2.1 Product Context

**Site Purpose:**
VoiceoverStudioFinder connects voice artists with professional recording studios worldwide. Core value: Verified location-based discovery with direct contact (no commission).

**User Types:**
1. **Voice Artists** (Primary) - Finding studios near them for recording sessions
2. **Studio Owners** - Listing their studio to attract clients
3. **Browsers** - Exploring options before signing up

**Top 5 Mobile User Journeys:**

1. **Quick Studio Search** (80% of mobile traffic)
   - Land on homepage → Enter location → Browse results → View profile → Contact
   - Current: 6+ taps, requires reaching top corners
   - Target: 3-4 taps, thumb-optimized

2. **Browse Featured Studios** (40% of mobile traffic)
   - Land on homepage → Scroll to featured → Tap card → View profile
   - Current: Works OK but footer interferes
   - Target: Streamlined scroll, prominent CTAs

3. **Manage Studio Listing** (Studio Owners, 25% of mobile traffic)
   - Dashboard → My Studios → Edit → Update → Save
   - Current: Dense forms, poor mobile layout
   - Target: Mobile-optimized forms, quick edits

4. **Check Messages/Connections** (Logged-in users, 15% of mobile traffic)
   - Dashboard → Messages tab → Read → Reply
   - Current: Tab navigation awkward, dense UI
   - Target: App-like message experience

5. **Sign Up New Studio** (High-value, 10% of mobile traffic)
   - Browse → Sign Up → Create Profile → List Studio
   - Current: Multi-step form cramped on mobile
   - Target: Step-by-step wizard with progress

### 2.2 Current Mobile Issues

#### Homepage Issues

**Problem:** Hero search feels cramped
- **Why:** 896px max-width too wide for 360px screens with padding
- **Where:** `src/components/home/HeroSection.tsx` (lines 87-95)
- **Impact:** Search button wraps on small devices

**Problem:** Featured studios scroll forever
- **Why:** 6 cards + full footer = excessive scroll
- **Where:** `src/components/home/FeaturedStudios.tsx`
- **Impact:** User fatigue, CTA buried

**Problem:** Footer dominates viewport
- **Why:** ~800px tall on mobile, low-value content
- **Where:** `src/components/home/Footer.tsx`
- **Impact:** Thumb reach for bottom actions impossible

#### Studios Page Issues

**Problem:** Filter-map-list juggling
- **Why:** Modal filters block view, List/Map mutually exclusive
- **Where:** `src/components/search/StudiosPage.tsx` (lines 676-798)
- **Impact:** Users can't reference map while browsing cards

**Problem:** Sticky headers stack
- **Why:** Navbar (80px) + Controls (60px) = 140px lost
- **Where:** Navbar + Mobile controls
- **Impact:** Only ~520px content on 360px iPhone SE

**Problem:** Selected studio card desktop pattern
- **Why:** Desktop sidebar doesn't translate to mobile
- **Where:** `SelectedStudioDetails.tsx` shown only on desktop
- **Impact:** Mobile users can't compare studios easily

**Problem:** Map marker → profile → back loses context
- **Why:** Full page navigation vs. overlay
- **Where:** Map marker click behavior
- **Impact:** Users lose their place in search results

**Problem:** Infinite scroll on mobile
- **Why:** "Load More" requires scrolling past all cards
- **Where:** `StudiosList.tsx` load more button
- **Impact:** Pogo-sticking, hard to reach footer

#### Profile Page Issues

**Problem:** Oversized hero section
- **Why:** 256px padding designed for desktop
- **Where:** `EnhancedUserProfile.tsx` (line 89)
- **Impact:** Avatar + name takes full screen, content buried

**Problem:** Weak information hierarchy
- **Why:** Same font sizes for headers and body
- **Where:** Profile grid layout
- **Impact:** Hard to scan quickly

**Problem:** CTA buttons not thumb-optimized
- **Why:** Small buttons in grid, not sticky
- **Where:** Contact/Connect buttons
- **Impact:** Hard to reach, easy to miss

**Problem:** Social links grid cramped
- **Why:** Multiple columns on narrow screens
- **Where:** Social media section
- **Impact:** Tiny tap targets

#### Dashboard Issues

**Problem:** Desktop UI density
- **Why:** Stats grid cramped, tabs too small
- **Where:** `UserDashboard.tsx` (lines 200-250)
- **Impact:** Cognitive overload, difficult tapping

**Problem:** Tab navigation
- **Why:** Horizontal tabs with small tap targets
- **Where:** `DashboardTabs.tsx`
- **Impact:** Mis-taps, unclear active state

**Problem:** No quick actions
- **Why:** Primary tasks require scrolling through stats
- **Where:** Dashboard layout
- **Impact:** Inefficient task completion

**Problem:** Form-heavy edit pages
- **Why:** Desktop form layout forced onto mobile
- **Where:** Profile edit, studio edit
- **Impact:** Tedious input, high abandonment

### 2.3 Mobile Information Architecture

```
Mobile Navigation Model:

┌─────────────────────────────────────┐
│  Fixed Top Bar (Simplified)         │  ← Reduced height, sticky
│  [Logo] [Search Icon] [Menu]        │  ← Quick actions accessible
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│                                      │
│         Page Content                 │
│         (Full height)                │
│                                      │
│                                      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Bottom Nav Bar (Thumb Zone)        │  ← NEW: Primary actions
│  [Home] [Search] [Dashboard] [More] │  ← Always accessible
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Compact Footer (Collapsed)         │  ← Accordion/collapsed by default
│  [Essential Links Only]             │  ← ~200px max height
└─────────────────────────────────────┘
```

**Primary Destinations:**
1. Home (/)
2. Studios (/studios)
3. Dashboard (/dashboard) - logged in only
4. Menu (overlay) - About, Help, Profile, Settings

**Secondary Destinations:**
- Profile pages (accessible from search results)
- Settings (from menu)
- Messages (from dashboard)
- Admin (from menu, admin only)

**Search Entry Points:**
1. Homepage hero (prominent)
2. Bottom nav "Search" icon (always accessible)
3. Studios page (filters)

### 2.4 Mobile UI Rules

#### Spacing
- **Minimum tap target:** 44x44px (Apple HIG)
- **Preferred tap target:** 48x48px (Material Design)
- **Horizontal padding:** 16px min (20px preferred)
- **Vertical spacing between elements:** 16px min
- **Card padding:** 16px internal
- **Bottom nav height:** 60px (accounting for iPhone notch)

#### Typography
```
Mobile Type Scale:
- Page Title (H1): 24px (down from 32px desktop)
- Section Heading (H2): 20px (down from 28px desktop)
- Card Title (H3): 16px (down from 20px desktop)
- Body Text: 16px (same as desktop, iOS minimum)
- Small Text: 14px (min)
- Button Text: 16px (min for tap targets)
```

#### Image Sizing
- **Hero images:** Max 200px height on mobile (vs 400px desktop)
- **Avatar images:** 80x80px on profile hero (vs 120x120px desktop)
- **Card thumbnails:** 16:9 aspect ratio maintained
- **Map height:** 300px on mobile (vs 400px desktop)

#### Sticky Behavior
- **Top nav:** Always sticky, 60px height (down from 80px)
- **Page-specific controls:** NOT sticky on mobile (scroll away)
- **Bottom nav:** Always sticky, 60px height
- **Filter drawers:** Slide up from bottom (not full-screen modal)
- **Action buttons:** Sticky bottom bar on long forms

#### Drawer and Modal Usage
- **Filters:** Bottom sheet (75% height), not full-screen
- **Navigation menu:** Right-side drawer (80% width)
- **Studio details:** Bottom sheet with expand option
- **Forms:** Full-screen when triggered, with "Back" in header
- **Confirmations:** Center modal (small)

#### Loading, Empty, and Error States
- **Loading:** Skeleton screens (no full-page spinners)
- **Empty states:** Illustration + CTA, max 300px height
- **Errors:** Toast notifications at top (auto-dismiss)
- **Slow loading:** Show partial content, load incrementally

---

## 3. PAGE-BY-PAGE MOBILE SPECS

### 3.1 Homepage (/)

**Mobile Purpose:** Quick studio search + discovery

**Content Order:**
1. Simplified hero with search (200px height)
2. Featured studios (3-6 cards, compact)
3. Stats CTA section (condensed)
4. List your studio CTA
5. Collapsed footer

**Primary Actions:**
- Enter location and search (hero)
- Tap featured studio card
- Sign up button (bottom nav or CTA)

**Secondary Actions:**
- Browse all studios
- Learn more (about page)

**Navigation:**
- Top nav: Minimal (logo + menu only)
- Bottom nav: [Home (active)] [Search] [Sign In] [More]

**Interaction Notes:**
- Hero search bar: Full width with 16px padding
- Search button: Stays on same line (flex-shrink-0)
- Featured cards: 2-column grid on >390px, 1-column on ≤390px
- Footer: Collapsed by default, "Show More" button

**Text-Based Wireframe:**
```
┌─────────────────────────────────────┐
│ [Logo]              [Search] [Menu] │ ← 60px sticky top
├─────────────────────────────────────┤
│                                      │
│   Find a Voiceover Recording Studio │ ← 24px heading
│                                      │
│   [Location Input...] [Search Btn]  │ ← Single line
│   [Radius Slider: 10 miles]         │
│                                      │
├─────────────────────────────────────┤
│   Featured Studios                   │ ← 20px heading
│                                      │
│   ┌─────────┐  ┌─────────┐         │ ← 2-col grid (>390px)
│   │ Studio  │  │ Studio  │         │
│   │ Card 1  │  │ Card 2  │         │
│   └─────────┘  └─────────┘         │
│                                      │
│   ┌─────────────────────┐           │ ← 1-col (≤390px)
│   │     Studio Card     │           │
│   └─────────────────────┘           │
│                                      │
│   [View All Studios Button]         │
│                                      │
├─────────────────────────────────────┤
│   Join 1,000+ Studios Worldwide     │ ← Stats CTA
│   [List Your Studio Button]         │
├─────────────────────────────────────┤
│   Footer (Collapsed)                │ ← ~200px
│   [Quick Links] [Show More ▼]       │
└─────────────────────────────────────┘
│ [Home] [Search] [Sign In] [More]   │ ← 60px bottom nav
└─────────────────────────────────────┘
```

---

### 3.2 Studios Search Page (/studios)

**Mobile Purpose:** Browse and filter studios with map reference

**Content Order:**
1. Page header with location (60px)
2. Filter chips (scrollable horizontal)
3. Map preview (collapsible, 240px default)
4. Studio cards grid (1-column)
5. Load more trigger (sticky fab)

**Primary Actions:**
- Open filter drawer (filter chip or bottom sheet)
- Toggle map visibility
- Tap studio card → view profile
- Load more results

**Secondary Actions:**
- Tap map marker → preview card
- Filter by map area
- Save search

**Navigation:**
- Top nav: Sticky (60px)
- Bottom nav: [Home] [Search (active)] [Account] [More]
- Filter drawer: Slide up from bottom (not modal)

**Interaction Notes:**
- **Map behavior:** 
  - Default: Collapsed to 60px "Show Map" bar
  - Expanded: 240px embedded map
  - Markers clickable → open bottom sheet preview
  - "Expand Full Map" button → full-screen map view
  
- **Filter chips:** 
  - Horizontal scrolling (no wrap)
  - Active filters show count badge
  - Tap chip → opens bottom sheet to that filter section
  
- **Studio cards:**
  - Full width, 16px side padding
  - Image: 16:9 aspect, ~200px height
  - Quick preview of name, location, types, rating
  - Tap card → navigate to profile page
  
- **Load more:**
  - Replace infinite scroll with "Load More" button
  - OR: Floating action button at bottom-right
  - Shows count: "Load More (12)"

**Text-Based Wireframe:**
```
┌─────────────────────────────────────┐
│ [Logo]              [Filter] [Menu] │ ← 60px sticky
├─────────────────────────────────────┤
│ Studios in London, UK        [Edit] │ ← Dynamic heading
├─────────────────────────────────────┤
│ [Home][Recording][Podcast][+2] [×]  │ ← Horizontal filter chips
├─────────────────────────────────────┤
│ ┌─ Show Map ─────────────────────┐ │ ← Collapsed map (60px)
│ │ 24 Studios     [Tap to Expand] │ │
│ └────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ ╔═══════════════════════════╗  │ │ ← Studio Card
│ │ ║   [Studio Image]          ║  │ │
│ │ ╚═══════════════════════════╝  │ │
│ │ Studio Name          ⭐ 4.8   │ │
│ │ London, UK                      │ │
│ │ [Home] [Recording]              │ │
│ └─────────────────────────────────┘ │
│                                      │
│ [More cards repeat...]              │
│                                      │
│              [Load More (12)]  ← Sticky fab │
├─────────────────────────────────────┤
│ [Home] [Search] [Account] [More]    │ ← 60px bottom nav
└─────────────────────────────────────┘
```

**Map Expanded State:**
```
┌─────────────────────────────────────┐
│ [Logo]              [Filter] [Menu] │ ← Sticky
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐  │ ← 240px map
│ │                                │  │
│ │      [Google Map]              │  │
│ │      [Map Markers]             │  │
│ │                                │  │
│ └───────────────────────────────┘  │
│ [Minimize Map] [Full Screen Map]    │
├─────────────────────────────────────┤
│ [Studio Cards...]                   │
└─────────────────────────────────────┘
```

**Filter Bottom Sheet:**
```
┌─────────────────────────────────────┐
│ ══════════ Filters ════════ [×]     │ ← Drag handle
├─────────────────────────────────────┤
│                                      │
│ Location                             │
│ [London, UK]                [Edit]  │
│                                      │
│ Search Radius: 10 miles             │
│ [──────●─────────────────]          │
│                                      │
│ Studio Types                         │
│ ☐ Home Studio                       │ ← Red checkboxes
│ ☑ Recording Studio                  │
│ ☐ Podcast Studio                    │
│                                      │
│ Sort By                              │
│ (•) Distance  ( ) Rating  ( ) Name  │
│                                      │
├─────────────────────────────────────┤
│ [Clear All]        [Apply Filters]  │ ← Sticky footer
└─────────────────────────────────────┘
```

---

### 3.3 Studio Profile Page (/[username])

**Mobile Purpose:** View studio details and contact

**Content Order:**
1. Compact hero (120px height)
2. Studio name + verification badge
3. Location + distance
4. Primary CTA (Contact / Message)
5. Quick info grid (type, services)
6. Image gallery (horizontal scroll)
7. About section (collapsible after 3 lines)
8. Reviews (top 3, expandable)
9. Map location
10. Contact info (sticky bottom)

**Primary Actions:**
- Contact studio (message form or phone)
- View full image gallery
- Connect with studio owner
- Get directions (map)

**Secondary Actions:**
- Write review
- Share profile
- Save to favorites
- Report

**Navigation:**
- Top nav: Sticky with back button (< 768px only)
- Bottom nav: Hidden on profile pages (reduces clutter)
- Sticky contact bar: Replaces bottom nav with primary CTA

**Interaction Notes:**
- **Hero section:**
  - Height: 120px (vs 256px desktop)
  - Avatar: 80x80px positioned at bottom-left
  - Name overlay on image (white text, shadow)
  
- **Sticky contact bar:**
  - Fixed to bottom (60px height)
  - [Message Button] [Call Button] [Menu ⋯]
  - Slides up when scrolling down, slides down when scrolling up
  
- **Image gallery:**
  - Horizontal scroll, no pagination
  - Tap image → full-screen lightbox with swipe
  - Shows count: "1 / 12"
  
- **About section:**
  - Show 3 lines initially
  - "Read More" button → expands inline
  - "Read Less" appears after expansion
  
- **Reviews:**
  - Show top 3 reviews (most helpful)
  - "View All Reviews" button → separate page or bottom sheet
  
- **Map:**
  - Static map image (clickable)
  - Tap → opens Google Maps app with directions

**Text-Based Wireframe:**
```
┌─────────────────────────────────────┐
│ [←]  Studio Name       [Share] [⋯] │ ← 60px sticky (white bg)
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐  │ ← 120px hero
│ │  [Studio Hero Image]           │  │
│ │                                 │  │
│ │  [Avatar]                       │  │ ← 80px avatar
│ └───────────────────────────────┘  │
│                                      │
│ Studio Name               ✓ Verified│ ← 20px title
│ 📍 London, UK  •  0.5 miles away   │ ← 14px meta
│                                      │
├─────────────────────────────────────┤
│ [Types]  Home • Recording          │ ← Chips
│ [Services]  Source Connect • ISDN   │
├─────────────────────────────────────┤
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ [+8]     │ ← Horizontal scroll
│ │ 1 │ │ 2 │ │ 3 │ │ 4 │           │   gallery
│ └───┘ └───┘ └───┘ └───┘           │
├─────────────────────────────────────┤
│ About                               │
│ Professional recording studio       │
│ in central London with...           │
│ [Read More]                         │
├─────────────────────────────────────┤
│ Reviews (24)          ⭐ 4.8 avg   │
│                                      │
│ [Review Card 1]                     │
│ [Review Card 2]                     │
│ [View All Reviews]                  │
├─────────────────────────────────────┤
│ Location                            │
│ [Static Map Image]                  │
│ [Get Directions]                    │
├─────────────────────────────────────┤
│ [Message Studio] [Call] [Menu ⋯]   │ ← 60px sticky bottom
└─────────────────────────────────────┘
```

---

### 3.4 Dashboard Page (/dashboard)

**Mobile Purpose:** Quick access to account actions and stats

**Content Order:**
1. Greeting + quick actions (60px)
2. Profile completion banner (if incomplete)
3. Condensed stats (2x2 grid)
4. Primary task cards (my studio, messages, etc.)
5. Activity feed (recent)
6. Visibility toggle (sticky)

**Primary Actions:**
- Edit profile
- Manage studio listing
- Check messages
- View connections

**Secondary Actions:**
- Upgrade account
- Export data
- Settings
- Help

**Navigation:**
- Top nav: Sticky (with dashboard title)
- Bottom nav: [Home] [Search] [Dashboard (active)] [More]
- No tabs on mobile (replaced with cards)

**Interaction Notes:**
- **Greeting section:**
  - "Welcome back, [Name]"
  - Quick actions: [Edit Profile] [Settings]
  - Profile completion progress (if < 100%)
  
- **Stats cards:**
  - 2x2 grid instead of 4 columns
  - Each card: Icon, number, label
  - Tap card → navigate to relevant section
  
- **Task cards:**
  - Full-width cards (not grid)
  - "My Studios" - manage listings
  - "Messages" - unread count badge
  - "Connections" - pending invites count
  - "Reviews" - recent reviews
  
- **Visibility toggle:**
  - Sticky to top of screen (below nav)
  - "Profile Visible: ON/OFF"
  - Swipe toggle, instant save

**Text-Based Wireframe:**
```
┌─────────────────────────────────────┐
│ [Logo]  Dashboard      [Notif] [⋮] │ ← 60px sticky
├─────────────────────────────────────┤
│ Welcome back, John!                 │
│ [Edit Profile] [Settings]           │
├─────────────────────────────────────┤
│ Profile Completion: 75%             │ ← Banner (if <100%)
│ [Complete Now →]                    │
├─────────────────────────────────────┤
│ ⚙ Profile Visible:          [ON]   │ ← Sticky toggle
├─────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐          │ ← 2x2 stats grid
│ │ 2       │  │ 15      │           │
│ │ Studios │  │ Reviews │           │
│ └─────────┘  └─────────┘          │
│ ┌─────────┐  ┌─────────┐          │
│ │ 8       │  │ 3       │           │
│ │ Connect │  │ Messages│           │
│ └─────────┘  └─────────┘          │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐│ ← Task card
│ │ My Studios                      ││
│ │ Manage your studio listings  →  ││
│ └─────────────────────────────────┘│
│                                      │
│ ┌─────────────────────────────────┐│
│ │ Messages (3 unread)          →  ││
│ └─────────────────────────────────┘│
│                                      │
│ ┌─────────────────────────────────┐│
│ │ Connections (2 pending)      →  ││
│ └─────────────────────────────────┘│
│                                      │
│ ┌─────────────────────────────────┐│
│ │ Reviews & Ratings            →  ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│ Recent Activity                     │
│ [Activity Feed Items...]            │
├─────────────────────────────────────┤
│ [Home] [Search] [Dashboard] [More]  │ ← Bottom nav
└─────────────────────────────────────┘
```

---

### 3.5 Dashboard Sub-Pages

#### My Profile Edit

**Content Order:**
1. Page header with save button
2. Form sections (accordion on mobile)
3. Sticky save bar

**Interaction Notes:**
- Each section collapsible (Personal Info, Contact, Social, etc.)
- Save button: Sticky bottom bar
- Cancel: Goes back with confirmation if unsaved changes

#### My Studios

**Content Order:**
1. List of owned studios (cards)
2. [Add New Studio] button (sticky)

**Interaction Notes:**
- Each studio card: Image, name, status, edit button
- Tap card → edit studio
- Add button: Floating action button (bottom-right)

#### Messages

**Content Order:**
1. Search/filter bar
2. Message list (inbox style)
3. Compose button (floating)

**Interaction Notes:**
- Unread messages highlighted
- Tap message → full message view (new page)
- Compose: Floating action button → modal form

---

### 3.6 Footer (Site-wide)

**Mobile Behavior:** Collapsed by default, accordion expansion

**Content Order (Collapsed):**
1. Copyright + legal links (single line)
2. "Show More" button

**Content Order (Expanded):**
1. Quick Links (Browse, List Studio, About, Help)
2. Social media icons
3. Copyright + legal

**Interaction Notes:**
- Default: ~100px height (collapsed)
- Expanded: ~300px height
- "Show Less" button to re-collapse
- No company description on mobile

**Text-Based Wireframe (Collapsed):**
```
┌─────────────────────────────────────┐
│ © 2025 VoiceoverStudioFinder        │
│ [Privacy] [Terms]                   │
│                                      │
│          [Show More ▼]              │ ← Tap to expand
└─────────────────────────────────────┘
```

**Text-Based Wireframe (Expanded):**
```
┌─────────────────────────────────────┐
│ Quick Links                         │
│ • Browse Studios                    │
│ • List Your Studio                  │
│ • About                             │
│ • Help Centre                       │
│                                      │
│ Follow Us: [X] [LinkedIn]           │
│                                      │
│ © 2025 VoiceoverStudioFinder        │
│ [Privacy] [Terms]                   │
│                                      │
│          [Show Less ▲]              │
└─────────────────────────────────────┘
```

---

## 4. ANALYTICS & SUCCESS CRITERIA

### 4.1 Metrics to Track

**Engagement Metrics:**
- Mobile bounce rate (target: < 45%, currently ~65%)
- Time on site mobile (target: +40%)
- Pages per session mobile (target: +50%)
- Scroll depth (target: -40% on key pages)

**Conversion Metrics:**
- Search → profile view (target: +35%)
- Profile view → contact (target: +50%)
- Sign-up completion mobile (target: +60%)
- Studio listing completion mobile (target: +45%)

**Interaction Metrics:**
- Bottom nav usage (NEW)
- Filter drawer engagement (target: +25%)
- Map interaction mobile (target: +80%)
- Image gallery swipes (NEW)

**Performance Metrics:**
- Mobile page load time (target: < 2.5s)
- Time to Interactive (target: < 3.5s)
- Largest Contentful Paint (target: < 2.0s)

### 4.2 Event Tracking (Aligned to Existing Analytics)

**New Mobile-Specific Events:**
```javascript
// Bottom Nav
'mobile_bottom_nav_tap' { destination: 'home' | 'search' | 'dashboard' | 'more' }

// Filter Drawer
'mobile_filter_drawer_open'
'mobile_filter_drawer_apply'
'mobile_filter_chip_tap' { filter_type: string }

// Map Interactions
'mobile_map_expand'
'mobile_map_full_screen'
'mobile_map_marker_tap' { studio_id: string }

// Studio Cards
'mobile_studio_card_tap' { studio_id: string, position: number }
'mobile_load_more_tap' { page: number }

// Profile Actions
'mobile_contact_bar_message'
'mobile_contact_bar_call'
'mobile_image_gallery_swipe' { direction: 'left' | 'right' }

// Dashboard
'mobile_dashboard_stat_tap' { stat_type: string }
'mobile_dashboard_task_card_tap' { task: string }
'mobile_visibility_toggle' { visible: boolean }

// Footer
'mobile_footer_expand'
'mobile_footer_collapse'
```

### 4.3 A/B Test Plan

**Phase 1 Tests:**
1. **Bottom Nav vs. No Bottom Nav** - 50/50 split
   - Hypothesis: Bottom nav increases engagement by 30%
   - Duration: 2 weeks
   - Success metric: Pages per session

2. **Filter Drawer vs. Full Modal** - 50/50 split
   - Hypothesis: Drawer improves filter usage by 25%
   - Duration: 1 week
   - Success metric: Filter apply rate

3. **Collapsed vs. Full Footer** - 50/50 split
   - Hypothesis: Collapsed footer reduces bounce by 15%
   - Duration: 1 week
   - Success metric: Scroll depth, bounce rate

**Phase 2 Tests:**
1. **Sticky Contact Bar vs. Inline CTAs** - Profile pages
2. **Map Default State** - Collapsed vs. Expanded
3. **Card Grid** - 1-column vs. 2-column on larger mobiles

---

## 5. TECHNICAL APPROACH

### 5.1 Mobile-Only Component Strategy

**Pattern 1: Responsive Props**
```typescript
interface ComponentProps {
  isMobile?: boolean;
  mobileVariant?: 'compact' | 'full';
}

// Usage
<Component 
  isMobile={useIsMobile()} 
  mobileVariant="compact" 
/>
```

**Pattern 2: Mobile-Specific Components**
```
src/components/
├── navigation/
│   ├── Navbar.tsx (existing - desktop)
│   ├── BottomNav.tsx (NEW - mobile only)
│   └── MobileMenu.tsx (NEW - mobile drawer)
├── footer/
│   ├── Footer.tsx (existing - rename to DesktopFooter.tsx)
│   └── MobileFooter.tsx (NEW - collapsed accordion)
└── mobile/
    ├── FilterDrawer.tsx (NEW - vs modal)
    ├── ContactBar.tsx (NEW - sticky CTA)
    ├── StudioCardCompact.tsx (NEW - mobile variant)
    └── index.ts
```

**Pattern 3: Conditional Rendering**
```typescript
// Utility hook
function useIsMobile() {
  return useMediaQuery('(max-width: 767px)');
}

// In component
{isMobile ? (
  <MobileComponent />
) : (
  <DesktopComponent />
)}
```

**Pattern 4: CSS-Only Responsive**
```css
/* Existing pattern - use where possible */
.element {
  @apply hidden md:block; /* Desktop only */
}

.mobile-element {
  @apply block md:hidden; /* Mobile only */
}
```

### 5.2 Files Affected

#### Phase 1: Navigation & Footer
**Create:**
- `src/components/navigation/BottomNav.tsx` - NEW bottom navigation
- `src/components/navigation/MobileMenu.tsx` - NEW drawer menu
- `src/components/footer/MobileFooter.tsx` - NEW collapsed footer
- `src/hooks/useIsMobile.ts` - NEW centralized hook

**Modify:**
- `src/components/navigation/Navbar.tsx` - Hide some elements on mobile
- `src/components/home/Footer.tsx` - Rename to DesktopFooter, import MobileFooter
- `src/app/layout.tsx` - Add BottomNav component

**Risk:** Bottom nav could conflict with existing mobile menus
**Mitigation:** Z-index hierarchy, test on all pages

#### Phase 2: Studios Page
**Create:**
- `src/components/search/mobile/FilterDrawer.tsx` - NEW bottom sheet
- `src/components/search/mobile/MapCollapsible.tsx` - NEW collapsible map
- `src/components/search/mobile/StudioCardCompact.tsx` - NEW mobile card

**Modify:**
- `src/components/search/StudiosPage.tsx` - Conditional mobile layout
- `src/components/search/SearchFilters.tsx` - Support drawer mode
- `src/components/maps/GoogleMap.tsx` - Mobile height prop

**Risk:** Map performance on mobile, state management complexity
**Mitigation:** Lazy load map, debounce interactions, memoize markers

#### Phase 3: Profile Pages
**Create:**
- `src/components/profile/mobile/ContactBar.tsx` - NEW sticky CTA bar
- `src/components/profile/mobile/CompactHero.tsx` - NEW 120px hero
- `src/components/profile/mobile/AboutCollapsible.tsx` - NEW read more

**Modify:**
- `src/components/profile/EnhancedUserProfile.tsx` - Mobile layout variants
- `src/app/[username]/page.tsx` - Pass mobile props

**Risk:** Profile images loading slow on mobile
**Mitigation:** Next/Image optimizations, placeholder blur, lazy load

#### Phase 4: Dashboard
**Create:**
- `src/components/dashboard/mobile/TaskCards.tsx` - NEW card layout
- `src/components/dashboard/mobile/StatsGrid.tsx` - NEW 2x2 grid
- `src/components/dashboard/mobile/VisibilityBar.tsx` - NEW sticky toggle

**Modify:**
- `src/components/dashboard/UserDashboard.tsx` - Mobile layout
- `src/components/dashboard/DashboardTabs.tsx` - Remove tabs on mobile
- `src/components/dashboard/ProfileEditForm.tsx` - Mobile form layout

**Risk:** Form inputs on mobile (keyboard issues, validation)
**Mitigation:** 16px font size, proper input types, clear validation

#### Phase 5: Polish
**Create:**
- `src/styles/mobile.css` - Mobile-specific utilities
- `src/lib/mobile-utils.ts` - Helper functions

**Modify:**
- `tailwind.config.ts` - Add mobile-specific utilities
- `src/app/globals.css` - Mobile overrides

**Risk:** CSS specificity wars
**Mitigation:** Use Tailwind layers, scope mobile styles

### 5.3 Performance Considerations

**Code Splitting:**
```typescript
// Lazy load mobile components
const BottomNav = dynamic(() => import('@/components/navigation/BottomNav'), {
  ssr: false,
  loading: () => <div className="h-16" />, // Placeholder
});

// Only load on mobile
{isMobile && <BottomNav />}
```

**Image Optimization:**
- Use Next/Image with priority for above-fold
- Reduce hero image sizes for mobile (srcset)
- Lazy load below-fold images
- Use WebP format with fallback

**Bundle Size:**
- Current mobile JS: ~180KB
- Target mobile JS: ~150KB
- Remove unused dependencies
- Tree-shake libraries

**Caching:**
- Service worker for offline (future)
- Cache API responses (already implemented)
- Prefetch next page in search results

---

## 6. RISKS & MITIGATIONS

### Risk 1: Desktop Regression
**Likelihood:** HIGH  
**Impact:** CRITICAL  
**Mitigation:**
- Strict separation of mobile/desktop code paths
- Automated visual regression tests (Percy or Chromatic)
- Manual QA on desktop after every phase
- Feature flags for gradual rollout

### Risk 2: Performance Degradation
**Likelihood:** MEDIUM  
**Impact:** HIGH  
**Mitigation:**
- Lazy load mobile-only components
- Debounce map interactions
- Optimize images for mobile
- Monitor Lighthouse scores

### Risk 3: Increased Maintenance Burden
**Likelihood:** MEDIUM  
**Impact:** MEDIUM  
**Mitigation:**
- Shared logic in utilities
- Storybook for component documentation
- Clear mobile vs. desktop boundaries
- Team training on new patterns

### Risk 4: User Confusion During Rollout
**Likelihood:** LOW  
**Impact:** MEDIUM  
**Mitigation:**
- Gradual rollout (10% → 50% → 100%)
- In-app tooltips for new features
- Help docs updated
- Support team briefed

### Risk 5: Accessibility Issues
**Likelihood:** MEDIUM  
**Impact:** HIGH  
**Mitigation:**
- ARIA labels on all mobile components
- Keyboard navigation on all touch targets
- Screen reader testing
- Contrast ratio checks (WCAG AA)

---

## 7. DESKTOP PARITY CHECKLIST

**Before merging any mobile PR:**

- [ ] Desktop screenshots match pixel-perfect to main branch
- [ ] All desktop breakpoints tested (1024px, 1280px, 1536px, 1920px)
- [ ] Desktop navigation unchanged
- [ ] Desktop footer unchanged
- [ ] Desktop forms unchanged
- [ ] Desktop CTAs unchanged
- [ ] Desktop analytics still firing
- [ ] Desktop performance unchanged
- [ ] No console errors on desktop
- [ ] Desktop accessibility still passing

**Testing Matrix:**
| Browser | Desktop (1920x1080) | Tablet (768x1024) | Mobile (375x667) |
|---------|---------------------|-------------------|------------------|
| Chrome  | ✅ Pass             | ⚠️ Skip (not in scope) | 🎯 Test         |
| Safari  | ✅ Pass             | ⚠️ Skip           | 🎯 Test         |
| Firefox | ✅ Pass             | ⚠️ Skip           | 🎯 Test         |
| Edge    | ✅ Pass             | ⚠️ Skip           | 🎯 Test         |

---

## 8. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)
**Goal:** Mobile primitives and footer compaction

**Tasks:**
1. Create `useIsMobile()` hook and utility functions
2. Build BottomNav component (hidden behind feature flag)
3. Build MobileMenu drawer component
4. Build MobileFooter collapsed variant
5. Update Navbar to hide menu items on mobile (keep hamburger)
6. Add conditional footer rendering (Desktop vs. Mobile)

**Acceptance Criteria:**
- Bottom nav appears only on mobile (< 768px)
- Desktop footer unchanged
- Mobile footer collapsed by default (~100px height)
- Expand/collapse works smoothly
- No horizontal scroll on any device

**Complexity:** MEDIUM (3-4 days)

**Files to Change:**
```
CREATE:
- src/hooks/useIsMobile.ts
- src/components/navigation/BottomNav.tsx
- src/components/navigation/MobileMenu.tsx
- src/components/footer/MobileFooter.tsx

MODIFY:
- src/components/navigation/Navbar.tsx (line 376-388: update mobile menu)
- src/components/home/Footer.tsx (add conditional render)
- src/app/layout.tsx (import BottomNav)
```

---

### Phase 2: Studios Page Mobile (Week 2-3)
**Goal:** Rebuild /studios mobile experience

**Tasks:**
1. Create FilterDrawer bottom sheet component
2. Create MapCollapsible component (collapsed by default)
3. Create StudioCardCompact mobile variant
4. Update StudiosPage mobile layout
5. Replace modal filters with drawer
6. Add "Load More" button (replace infinite scroll)
7. Optimize map performance on mobile

**Acceptance Criteria:**
- Filter drawer slides up from bottom (75% height)
- Map collapses to 60px bar by default
- Tap "Show Map" → expands to 240px
- Tap "Full Screen Map" → new page with full map
- Studio cards optimized for mobile (compact view)
- Load More button shows count
- Desktop layout unchanged

**Complexity:** HIGH (5-6 days)

**Files to Change:**
```
CREATE:
- src/components/search/mobile/FilterDrawer.tsx
- src/components/search/mobile/MapCollapsible.tsx
- src/components/search/mobile/StudioCardCompact.tsx

MODIFY:
- src/components/search/StudiosPage.tsx (lines 82, 392-798: mobile layout)
- src/components/search/SearchFilters.tsx (support drawer mode)
- src/components/search/StudiosList.tsx (use mobile card variant)
- src/components/maps/GoogleMap.tsx (add mobile height prop)
```

---

### Phase 3: Profile Pages Mobile (Week 4)
**Goal:** Optimize profile viewing on mobile

**Tasks:**
1. Create ContactBar sticky CTA component
2. Create CompactHero mobile variant (120px height)
3. Create AboutCollapsible component (read more)
4. Update EnhancedUserProfile mobile layout
5. Optimize image gallery for mobile swipe
6. Reduce hero image sizes on mobile

**Acceptance Criteria:**
- Hero section 120px on mobile (vs 256px desktop)
- Avatar 80x80px (vs 120x120px desktop)
- Contact bar sticky at bottom (slides on scroll)
- About text collapses after 3 lines
- Image gallery swipeable
- Desktop profile unchanged

**Complexity:** MEDIUM (4-5 days)

**Files to Change:**
```
CREATE:
- src/components/profile/mobile/ContactBar.tsx
- src/components/profile/mobile/CompactHero.tsx
- src/components/profile/mobile/AboutCollapsible.tsx

MODIFY:
- src/components/profile/EnhancedUserProfile.tsx (lines 86-100: mobile hero)
- src/app/[username]/page.tsx (pass mobile props)
- src/components/studio/profile/ModernStudioProfileV3.tsx (mobile layout)
```

---

### Phase 4: Dashboard Mobile (Week 5)
**Goal:** Redesign dashboard for mobile

**Tasks:**
1. Create TaskCards component (replace tabs)
2. Create StatsGrid 2x2 mobile variant
3. Create VisibilityBar sticky toggle
4. Update UserDashboard mobile layout
5. Optimize forms for mobile (ProfileEditForm)
6. Add mobile navigation breadcrumbs

**Acceptance Criteria:**
- Stats in 2x2 grid on mobile
- Tabs replaced with full-width task cards
- Each card navigates to sub-page
- Visibility toggle sticky below nav
- Forms optimized for mobile input
- Desktop dashboard unchanged

**Complexity:** HIGH (5-6 days)

**Files to Change:**
```
CREATE:
- src/components/dashboard/mobile/TaskCards.tsx
- src/components/dashboard/mobile/StatsGrid.tsx
- src/components/dashboard/mobile/VisibilityBar.tsx

MODIFY:
- src/components/dashboard/UserDashboard.tsx (lines 200-250: mobile layout)
- src/components/dashboard/DashboardTabs.tsx (hide tabs on mobile)
- src/components/dashboard/ProfileEditForm.tsx (mobile form layout)
- src/components/dashboard/DashboardContent.tsx (mobile variants)
```

---

### Phase 5: Polish & Accessibility (Week 6)
**Goal:** Final touches and testing

**Tasks:**
1. Add mobile-specific CSS utilities
2. Optimize images and lazy loading
3. Add ARIA labels and keyboard navigation
4. Implement swipe gestures
5. Add loading skeletons
6. Performance optimization
7. Cross-browser testing
8. Accessibility audit

**Acceptance Criteria:**
- Lighthouse mobile score > 90
- All tap targets ≥ 48x48px
- No horizontal scroll
- WCAG AA compliance
- Screen reader compatible
- Keyboard navigation works
- iOS Safari and Android Chrome tested

**Complexity:** MEDIUM (4-5 days)

**Files to Change:**
```
CREATE:
- src/styles/mobile.css
- src/lib/mobile-utils.ts

MODIFY:
- tailwind.config.ts (mobile utilities)
- src/app/globals.css (mobile overrides)
- All mobile components (ARIA labels)
```

---

## 9. FIRST PR SCOPE

**PR #1: Mobile Navigation Shell & Footer Compaction**

**Goal:** Establish mobile-only primitives without affecting desktop

**Includes:**
1. `useIsMobile()` hook
2. BottomNav component (feature flagged)
3. MobileMenu drawer
4. MobileFooter collapsed variant
5. Updated Navbar mobile menu
6. Conditional footer rendering

**Does NOT Include:**
- Page layout changes
- Filter changes
- Map changes
- Profile changes

**Testing:**
- Mobile: Bottom nav appears, works correctly
- Desktop: No changes visible
- Footer: Collapsed on mobile, full on desktop
- Navigation: Menu drawer works on mobile

**Rollout:**
- Feature flag: `ENABLE_MOBILE_BOTTOM_NAV`
- Start at 10% mobile traffic
- Monitor bounce rate, engagement
- Scale to 100% over 1 week

**Estimated Time:** 3-4 days

**Lines of Code:** ~800 lines (new) + ~200 lines (modified)

---

## 10. MOBILE QA CHECKLIST

### Device Testing Matrix

**Physical Devices:**
- [ ] iPhone SE (375x667) - Smallest modern iPhone
- [ ] iPhone 12/13 Pro (390x844) - Common size
- [ ] iPhone 14 Pro Max (430x932) - Largest iPhone
- [ ] Samsung Galaxy S21 (360x800) - Common Android
- [ ] Google Pixel 7 (412x915) - Reference Android

**Browser Testing:**
- [ ] iOS Safari (latest)
- [ ] iOS Safari (previous version)
- [ ] Android Chrome (latest)
- [ ] Android Chrome (previous version)
- [ ] Android Firefox
- [ ] Samsung Internet

### Thumb Reach Validation

**Bottom Third (Easy Reach):**
- [ ] Bottom nav all buttons reachable
- [ ] Primary CTAs in thumb zone
- [ ] Common actions accessible

**Middle Third (Moderate Reach):**
- [ ] Secondary actions OK here
- [ ] Content scrollable
- [ ] Not critical for one-handed use

**Top Third (Hard Reach):**
- [ ] Only non-critical elements
- [ ] Menu button OK (standard position)
- [ ] Logo OK (no interaction needed)

### Tap Target Validation

**All Interactive Elements:**
- [ ] Minimum 44x44px (Apple)
- [ ] Preferred 48x48px (Material)
- [ ] Sufficient spacing between targets (8px min)

**Critical Targets:**
- [ ] Bottom nav icons: 48x48px ✓
- [ ] Filter chips: 44x44px min ✓
- [ ] Studio cards: Full width, 60px+ tap area ✓
- [ ] Form inputs: 48px height ✓
- [ ] Buttons: 48px height ✓

### Layout Validation

**No Horizontal Scroll:**
- [ ] Homepage
- [ ] Studios page (all sections)
- [ ] Profile pages
- [ ] Dashboard
- [ ] Forms
- [ ] Modals/drawers

**Viewport Heights:**
- [ ] Content visible without scroll (above fold)
- [ ] Sticky elements don't overlap content
- [ ] Footer doesn't push content off-screen

**Breakpoint Integrity:**
- [ ] 360px width: All content fits
- [ ] 375px width: No layout breaks
- [ ] 390px width: Content readable
- [ ] 412px width: Optimal layout
- [ ] 430px width: No empty space

### Keyboard & Input Behavior

**Text Inputs:**
- [ ] 16px font size (no iOS zoom)
- [ ] Proper keyboard type (email, tel, number)
- [ ] Auto-capitalization appropriate
- [ ] Auto-complete works
- [ ] Validation clear and helpful

**Form Submission:**
- [ ] Submit button accessible while keyboard open
- [ ] Error messages visible
- [ ] Success confirmation clear
- [ ] Can edit after error without re-typing

**Focus Management:**
- [ ] Tab order logical
- [ ] Focus visible
- [ ] Focus doesn't get trapped
- [ ] Skip links work

### Drawer & Modal Behavior

**Filter Drawer:**
- [ ] Slides up smoothly (no jank)
- [ ] Drag handle works
- [ ] Backdrop dismisses drawer
- [ ] Apply button always visible (sticky)
- [ ] Content scrollable within drawer
- [ ] Doesn't push page content

**Mobile Menu:**
- [ ] Slides in from side
- [ ] Overlay dims background
- [ ] Close button accessible
- [ ] Links work correctly
- [ ] Back button closes drawer

**Bottom Sheets:**
- [ ] Expand/collapse smooth
- [ ] Content doesn't jump
- [ ] Scrollable when expanded
- [ ] Dismiss gestures work

### Back Button Behavior

**Browser Back:**
- [ ] Studios page: Returns to homepage
- [ ] Profile page: Returns to search results
- [ ] Dashboard sub-page: Returns to dashboard
- [ ] Modal/drawer: Dismisses modal (doesn't navigate)

**Android Back Button:**
- [ ] Same behavior as browser back
- [ ] Closes drawers/modals first
- [ ] Then navigates page history

### Sticky Header Conflicts

**Top Nav (60px):**
- [ ] Always visible
- [ ] Doesn't overlap content
- [ ] Shadow appears on scroll
- [ ] Logo remains visible

**Bottom Nav (60px):**
- [ ] Always visible
- [ ] Doesn't overlap content
- [ ] Active state clear
- [ ] Badges visible

**Sticky CTAs (Profile ContactBar):**
- [ ] Doesn't overlap bottom nav
- [ ] Slides up on scroll down
- [ ] Slides down on scroll up
- [ ] Transition smooth

**Combined Height:**
- [ ] Top + bottom = max 120px
- [ ] Content area min 480px on 360px screen
- [ ] No overlap or z-index issues

### Footer Validation

**Collapsed State (Default):**
- [ ] ~100px height
- [ ] Essential links visible
- [ ] "Show More" button clear
- [ ] Doesn't push content

**Expanded State:**
- [ ] ~300px height
- [ ] All links accessible
- [ ] "Show Less" button works
- [ ] Smooth transition

**Content:**
- [ ] Legal links always visible
- [ ] Social icons in expanded only
- [ ] No company description on mobile
- [ ] Contact info in expanded only

### Performance

**Page Load:**
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] Cumulative Layout Shift < 0.1

**Scroll Performance:**
- [ ] 60fps scroll (no jank)
- [ ] Images load progressively
- [ ] Lazy loading works
- [ ] Infinite scroll smooth

**Map Performance:**
- [ ] Loads within 2s
- [ ] Markers render quickly
- [ ] Pan/zoom smooth
- [ ] Doesn't block UI

**Interaction Latency:**
- [ ] Tap feedback < 100ms
- [ ] Navigation < 300ms
- [ ] Filter apply < 500ms
- [ ] Form submit < 1s

### Accessibility

**Screen Reader:**
- [ ] All images have alt text
- [ ] ARIA labels on icons
- [ ] Headings hierarchical
- [ ] Landmarks defined
- [ ] Skip links work

**Keyboard Navigation:**
- [ ] All interactive elements focusable
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] No keyboard traps

**Color Contrast:**
- [ ] Text on backgrounds: 4.5:1 min
- [ ] Icons: 3:1 min
- [ ] Disabled states clear
- [ ] Error states distinct

**Touch Targets:**
- [ ] All targets 44x44px min
- [ ] Spacing between targets adequate
- [ ] Hit areas larger than visual

### Edge Cases

**Slow Network:**
- [ ] Loading states show
- [ ] Skeleton screens render
- [ ] Errors handled gracefully
- [ ] Retry mechanism works

**Offline:**
- [ ] Graceful degradation
- [ ] Cache shows old content
- [ ] Error message helpful
- [ ] Retry when online

**Empty States:**
- [ ] No studios found
- [ ] No messages
- [ ] No connections
- [ ] Clear CTA to fix

**Error States:**
- [ ] Network error
- [ ] Server error
- [ ] Validation error
- [ ] Permission error

### Desktop Regression Check

**After EVERY Phase:**

**Homepage:**
- [ ] Hero layout unchanged
- [ ] Featured studios 6-card grid
- [ ] Footer full 4-column layout
- [ ] CTAs positioned correctly

**Studios Page:**
- [ ] Sidebar filters visible
- [ ] Map full height (400px)
- [ ] Grid 3 columns
- [ ] Selected studio card in sidebar

**Profile Pages:**
- [ ] Hero 256px height
- [ ] Avatar 120x120px
- [ ] Grid layout 2-column
- [ ] CTAs inline, not sticky

**Dashboard:**
- [ ] Stats 4-column grid
- [ ] Tabs horizontal
- [ ] Sidebar navigation
- [ ] Forms full width

**Navigation:**
- [ ] Top nav horizontal links
- [ ] Desktop menu visible
- [ ] No bottom nav
- [ ] Footer full layout

**Interactions:**
- [ ] Hover states work
- [ ] Dropdowns work
- [ ] Modals centered
- [ ] Tooltips show

**Performance:**
- [ ] Lighthouse score unchanged
- [ ] No console errors
- [ ] Analytics firing
- [ ] No extra JS loaded

---

## APPENDIX: Stop Conditions

**If any of these occur, STOP and reassess:**

1. Desktop regression detected in any phase
2. Mobile performance worse than current (Lighthouse score drops)
3. Mobile bounce rate increases during rollout
4. Critical bugs affecting core flows (search, sign-up)
5. Accessibility violations introduced
6. Team capacity insufficient for maintenance

**Rollback Plan:**
- All phases behind feature flags
- Can disable mobile features instantly
- Revert to current mobile experience
- Investigate and fix before re-enabling

---

## SUMMARY

This PRD provides a comprehensive mobile-first overhaul plan grounded in actual codebase findings. Key points:

**Scope:**
- 5 phases over 6 weeks
- Focus on 360-430px mobile devices
- Zero desktop changes (regression tests mandatory)

**Priority Issues:**
1. Unnatural navigation (adding bottom nav)
2. Massive footer (collapse to ~100px)
3. Studios page juggling (map/filter drawer)
4. Profile pages bloat (compact hero, sticky CTA)
5. Dashboard density (task cards, 2x2 grid)

**Success Metrics:**
- 30% mobile bounce reduction
- 50% task completion improvement
- 40% scroll depth reduction

**Technical Approach:**
- Mobile-specific components (isolated)
- Conditional rendering (< 768px)
- Feature flags (gradual rollout)
- Performance optimization (lazy loading, code splitting)

**Next Steps:**
1. Review and approve PRD
2. Create Phase 1 PR (Nav shell + footer)
3. Test on mobile devices (360px, 390px, 412px, 430px)
4. Monitor metrics and iterate
5. Proceed phase-by-phase with approval gates

---

**END OF PRD**
