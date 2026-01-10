# PRD: Typography Refinement and Enhanced UX for Profile Pages

## Introduction/Overview

This PRD outlines a comprehensive UI improvement initiative focused on refining the site's typography hierarchy and enhancing user interaction patterns on profile pages. The current typography uses oversized headers across most pages (excluding the homepage), creating excessive visual weight and consuming valuable screen real estate. Additionally, key user actions on profile pages (contacting studios and getting directions) need more intuitive, platform-aware implementations.

**Problem Statement:**
- Headers on profile and secondary pages are too large, creating visual imbalance and wasting space
- Padding around reduced-size headers needs proportional adjustment for optimal visual hierarchy
- The "Message Studio" button currently opens a placeholder modal instead of facilitating actual contact
- The "Get Directions" button doesn't leverage native platform capabilities (mobile apps) for optimal UX

**Goal:**
Improve visual hierarchy, information density, and user interaction patterns to create a more professional, refined interface while maintaining the homepage's existing bold, attention-grabbing design.

## Goals

1. **Refine Typography Hierarchy:** Reduce header sizes (h1, h2, h3) across non-homepage pages by 50% for improved visual balance and information density
2. **Preserve Homepage Impact:** Maintain the current large, bold homepage hero typography by creating dedicated homepage-specific styles
3. **Optimize Spacing:** Adjust padding and margins around headers to complement the reduced font sizes, eliminating excessive whitespace
4. **Enable Direct Contact:** Transform the "Message Studio" button into a functional mailto link with pre-filled context
5. **Implement Smart Navigation:** Create platform-aware directions functionality that leverages native Google Maps apps on mobile while providing fallback web solutions
6. **Maintain Consistency:** Apply changes uniformly across all affected pages while respecting platform-specific best practices

## User Stories

### Typography Improvements
**US-1:** As a user browsing studio profiles, I want headers to be appropriately sized so that I can view more content without excessive scrolling.

**US-2:** As a site visitor on the homepage, I want to see bold, impactful headlines that immediately capture my attention and convey the site's purpose.

**US-3:** As a user navigating between pages, I want consistent typography that creates a professional, cohesive experience without jarring size differences.

### Contact Functionality
**US-4:** As a potential client viewing a studio profile, I want to click "Message Studio" and have my default email client open with appropriate context so that I can quickly compose an inquiry.

**US-5:** As a user encountering a profile with contact restrictions, I want clear feedback explaining why I cannot contact them directly and what alternative actions I can take.

### Directions Functionality
**US-6:** As a mobile user wanting directions to a studio, I want the "Get Directions" button to open in my Google Maps app (if installed) so that I can use my familiar navigation tools.

**US-7:** As a desktop user clicking "Get Directions," I want to open Google Maps in my browser with my current location pre-filled so that I can plan my route.

**US-8:** As a user on any platform, I want the directions feature to gracefully handle location permissions and app availability without errors or broken experiences.

## Functional Requirements

### 1. Typography System Modifications

**FR-1.1:** Reduce the font size of `h1`, `h2`, and `h3` elements by 50% in the global CSS/Tailwind configuration.
- Current typical sizes: h1 (36-48px), h2 (30-36px), h3 (24-30px)
- New target sizes: h1 (18-24px), h2 (15-18px), h3 (12-15px)

**FR-1.2:** Create a new CSS class/style `hp1` (homepage-h1) that maintains the current h1 font size for use exclusively on homepage hero sections.

**FR-1.3:** Update the homepage hero section to use `hp1` instead of standard `h1` tags/classes.

**FR-1.4:** Ensure the typography changes do NOT affect:
- The main hero section title on the homepage
- Any other text elements (paragraphs, labels, buttons, etc.)

**FR-1.5:** Verify font-weight, line-height, and letter-spacing remain proportional and legible at the new sizes.

### 2. Spacing Adjustments

**FR-2.1:** Review and manually adjust padding/margins around all `h1`, `h2`, and `h3` elements on non-homepage pages.

**FR-2.2:** Reduce vertical spacing (margin-top, margin-bottom, padding-top, padding-bottom) around headers to eliminate excessive gaps created by smaller font sizes.

**FR-2.3:** Maintain visual hierarchy: ensure spacing still clearly differentiates between heading levels and content sections.

**FR-2.4:** Test spacing adjustments on:
- Profile pages (studio profiles, user profiles)
- Secondary pages (About, Contact, Terms, Privacy, etc.)
- Admin pages
- Search results pages

**FR-2.5:** Do NOT modify spacing on the homepage.

### 3. Message Studio Button Enhancement

**FR-3.1:** Replace the current "Message Studio" button modal functionality with a `mailto:` link.

**FR-3.2:** The mailto link must include:
- **To:** The studio owner's email address (from `studio.owner.email`)
- **Subject:** Pre-filled with: `Enquiry about [Studio Name] from voiceoverstudiofinder.com`
- Replace `[Studio Name]` with the actual studio name dynamically

**FR-3.3:** Email availability check:
- If `studio.owner.profile.showEmail === false` OR email is unavailable
- Display the button in a disabled/alternative state
- On click, open a modal with the message: "Contact information not available, please visit the studio's website directly"
- If a website URL exists, provide a clickable link to the website in the modal

**FR-3.4:** Button visual appearance should remain consistent with current design (same styling, positioning, icon).

**FR-3.5:** The button must handle email encoding properly (URL encode special characters in subject line and studio name).

### 4. Get Directions Button Enhancement

**FR-4.1:** Platform Detection:
- Detect if the user is on a mobile device (iOS or Android)
- Detect if the user is on desktop

**FR-4.2:** Desktop Behavior:
- Open Google Maps web interface in a new browser tab
- URL format: `https://www.google.com/maps/dir/?api=1&destination=[latitude],[longitude]`
- Use current location as starting point (Google Maps will request permission)
- If coordinates unavailable, use address: `https://www.google.com/maps/dir/?api=1&destination=[encoded-address]`

**FR-4.3:** Mobile Behavior:
- Attempt to open the native Google Maps app using deep linking
- iOS: `comgooglemaps://?daddr=[latitude],[longitude]&directionsmode=driving`
- Android: `google.navigation:q=[latitude],[longitude]`
- Fallback to web URL if app not installed or deep link fails

**FR-4.4:** User Location Handling:
- Allow Google Maps to request and use current location (default behavior)
- Users can manually override their starting location within Google Maps

**FR-4.5:** Error Handling:
- If coordinates AND address are both unavailable, disable the button
- Show tooltip: "Location information not available"

**FR-4.6:** Button must remain visually consistent with current design.

### 5. Implementation Requirements

**FR-5.1:** All changes must be implemented together as a single cohesive update.

**FR-5.2:** Changes must be thoroughly tested in development environment before production deployment.

**FR-5.3:** Testing must include:
- Visual regression testing for typography changes across all page types
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing (iOS Safari, Android Chrome)
- Email client testing for mailto links
- Google Maps integration testing on multiple platforms

**FR-5.4:** Code must follow existing project conventions (TypeScript, React Server Components, Tailwind CSS).

**FR-5.5:** Ensure no breaking changes to existing functionality.

## Non-Goals (Out of Scope)

**NG-1:** Modifying body text, button text, or other non-header typography sizes.

**NG-2:** Redesigning the overall layout or structure of profile pages beyond spacing adjustments.

**NG-3:** Implementing an in-app messaging system (mailto is sufficient for this iteration).

**NG-4:** Supporting navigation apps other than Google Maps (e.g., Apple Maps, Waze).

**NG-5:** Creating a location picker or custom routing interface (leverage existing Google Maps functionality).

**NG-6:** Modifying mobile responsiveness beyond what's needed for these specific changes.

**NG-7:** Updating database schema or adding new data fields.

## Design Considerations

### Typography Scale

The new typography hierarchy should follow this approximate scale:

```
Homepage Hero (hp1): 48px (unchanged)
Standard h1: 24px (reduced from ~48px)
Standard h2: 18px (reduced from ~36px)  
Standard h3: 15px (reduced from ~30px)
Body text: 16px (unchanged)
```

### Spacing Guidelines

- Reduce header margins proportionally to font size reduction
- Maintain clear visual breaks between sections
- Test with varying content lengths (short titles, long titles)
- Ensure mobile spacing is appropriate for touch targets

### Button States

**Message Studio Button:**
- Default: Primary blue, with envelope icon
- Disabled: Gray with reduced opacity
- Hover: Darker blue (desktop)

**Get Directions Button:**
- Current styling maintained
- Icon: External link or navigation arrow
- Same size and visual weight as current implementation

## Technical Considerations

### CSS/Tailwind Configuration

**Location:** Primary global CSS file needs to be identified. Likely candidates:
- `src/app/globals.css`
- Tailwind configuration in `tailwind.config.ts`
- Component-level Tailwind classes throughout the application

**Approach:**
- Update base heading styles in globals.css OR
- Override Tailwind's default heading scale in config OR  
- Use utility classes consistently across components

**Homepage Exception:**
- Create `.hp1` class for homepage hero
- Apply to homepage hero component only
- Ensure proper specificity to override default h1 styles

### Platform Detection

```typescript
// Mobile detection
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// iOS vs Android
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
```

### Google Maps Deep Linking

**iOS URL Schemes:**
```
comgooglemaps://?daddr=latitude,longitude&directionsmode=driving
```

**Android Intent:**
```
google.navigation:q=latitude,longitude
```

**Fallback Web URL:**
```
https://www.google.com/maps/dir/?api=1&destination=latitude,longitude
```

### Email Encoding

```typescript
const subject = encodeURIComponent(
  `Enquiry about ${studioName} from voiceoverstudiofinder.com`
);
const mailtoLink = `mailto:${email}?subject=${subject}`;
```

### Component Updates Required

1. **ModernStudioProfileV3.tsx** - Message Studio button, Get Directions button
2. **globals.css** or **tailwind.config.ts** - Typography scales
3. **HomePage component(s)** - Update h1 to hp1 class
4. **Various page components** - Verify/adjust spacing after typography changes

## Success Metrics

**SM-1:** Visual Consistency
- Typography hierarchy is clear and consistent across 100% of non-homepage pages
- No broken layouts or text overflow issues
- Spacing adjustments approved by design review

**SM-2:** Functional Success Rate
- 95%+ of "Message Studio" button clicks successfully open email client (for enabled profiles)
- 95%+ of "Get Directions" clicks successfully open Google Maps (app or web)
- Zero JavaScript errors related to new functionality

**SM-3:** User Engagement
- Reduction in "contact" related support inquiries (baseline to be established)
- Increase in actual email inquiries sent to studios (indirect metric via user feedback)

**SM-4:** Cross-Platform Functionality
- Features work correctly on iOS, Android, Windows, macOS
- Features work in Chrome, Firefox, Safari, Edge (latest 2 versions)

**SM-5:** No Regression
- All existing features continue to work as expected
- No new accessibility issues introduced (test with screen readers)
- Page load times unchanged or improved

## Open Questions

**OQ-1:** Should we add analytics tracking to the mailto and directions buttons to measure usage?

**OQ-2:** Do we want to add a "Copy Email" fallback option for users who prefer not to use mailto links?

**OQ-3:** Should we consider adding Apple Maps as an alternative for iOS users, or is Google Maps sufficient?

**OQ-4:** For the modal when email is unavailable, should we also show the phone number if available?

**OQ-5:** Should we implement any rate limiting or bot protection on the email links to prevent spam harvesting?

**OQ-6:** Do we want to add a toast notification confirming the action when buttons are clicked (e.g., "Opening email client...")?

**OQ-7:** Should the typography changes be documented in a style guide for future reference?

---

## Implementation Checklist

- [ ] Identify and update global CSS/typography configuration
- [ ] Create hp1 class for homepage hero
- [ ] Update homepage hero to use hp1
- [ ] Test typography changes on all page types
- [ ] Manually adjust spacing/padding across affected pages
- [ ] Implement mailto functionality for Message Studio button
- [ ] Create modal for unavailable email addresses
- [ ] Implement platform detection for Get Directions
- [ ] Implement Google Maps deep linking (iOS/Android)
- [ ] Implement web fallback for directions
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Accessibility testing
- [ ] Production deployment after approval

---

**PRD Version:** 1.0  
**Created:** 2025-10-06  
**Status:** Ready for Implementation  
**Estimated Effort:** 2-3 development days




