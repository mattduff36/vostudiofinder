# User Profile Management Dashboard - Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** January 11, 2025  
**Author:** Development Team  
**Status:** Draft - Ready for Review

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Objectives](#goals--objectives)
4. [Target Users](#target-users)
5. [User Stories](#user-stories)
6. [Functional Requirements](#functional-requirements)
7. [Technical Requirements](#technical-requirements)
8. [UI/UX Design Specifications](#uiux-design-specifications)
9. [Data Model Reference](#data-model-reference)
10. [API Requirements](#api-requirements)
11. [Implementation Phases](#implementation-phases)
12. [Success Metrics](#success-metrics)
13. [Constraints & Assumptions](#constraints--assumptions)

---

## 📊 Executive Summary

The User Profile Management Dashboard will transform the currently underutilized `/dashboard` page into a comprehensive profile management interface. This feature will empower voiceover professionals to maintain their studio profiles, manage content, upload images, and control visibility settings—all without requiring admin intervention.

**Key Benefits:**
- **User Empowerment:** Self-service profile management reduces dependency on admin support
- **Improved User Experience:** Intuitive interface modeled after successful admin patterns
- **Increased Engagement:** Users can keep profiles current, leading to better discovery
- **Reduced Admin Burden:** Less manual profile maintenance required

---

## 🎯 Problem Statement

### Current State
- The `/dashboard` page exists but provides minimal functionality
- Users cannot edit their own profile information
- Profile updates require admin intervention via `/admin/studios`
- No self-service image management
- Users lack visibility controls for their information

### Desired State
- Users have a dedicated, feature-rich dashboard for profile management
- Self-service editing for all profile fields (within appropriate permissions)
- Intuitive image gallery management with drag-and-drop reordering
- Granular visibility controls for contact information and location data
- Real-time preview of profile changes

---

## 🎯 Goals & Objectives

### Primary Goals
1. **Enable Self-Service:** Allow users to manage 100% of their editable profile data
2. **Improve User Experience:** Create an intuitive, professional interface
3. **Increase Profile Completeness:** Encourage users to maintain comprehensive profiles
4. **Reduce Admin Workload:** Minimize support requests for profile updates

### Secondary Goals
1. **Mobile Responsiveness:** Ensure full functionality on mobile devices
2. **Visual Consistency:** Match existing design patterns from admin interface
3. **Performance:** Fast loading and saving of profile data
4. **Accessibility:** WCAG 2.1 AA compliance

### Success Criteria
- 80% of users update their profile within first week of launch
- 50% reduction in admin support tickets related to profile edits
- Average profile completeness increases from 60% to 85%
- User satisfaction score of 4.5/5 or higher

---

## 👥 Target Users

### Primary Users
**Voiceover Professionals / Studio Owners**
- Need to maintain current studio information
- Want to showcase their services and equipment
- Require control over contact information visibility
- Desire professional presentation of their work

### User Characteristics
- Age: 25-65
- Tech Proficiency: Beginner to Advanced
- Access: Desktop (70%), Mobile (30%)
- Frequency: Weekly to monthly profile updates

---

## 📖 User Stories

### Epic 1: Profile Information Management

**US-001: Edit Basic Studio Information**
```
As a studio owner
I want to edit my studio name, type, and description
So that my profile accurately represents my business
```

**Acceptance Criteria:**
- Can edit studio name (max 30 characters)
- Can select multiple studio types (Home, Recording, Editing, VO-Coach, Podcast, Voiceover)
- Can write short about (1 line) and full about (multi-paragraph)
- Changes save without page reload
- Validation prevents empty required fields

---

**US-002: Manage Contact Information**
```
As a studio owner
I want to update my contact details and control their visibility
So that clients can reach me through preferred channels
```

**Acceptance Criteria:**
- Can edit email, phone, and website URL
- Can toggle visibility for email, phone, address
- Can control map and directions display
- Contact settings save independently
- Email is always protected from bot scraping

---

**US-003: Update Location Information**
```
As a studio owner
I want to set my studio location and address
So that local clients can find me
```

**Acceptance Criteria:**
- Can enter full address
- Can set location/region for general area
- Can toggle address visibility
- Can control map display independently
- Geocoding updates automatically (if applicable)

---

### Epic 2: Content & Media Management

**US-004: Manage Studio Images**
```
As a studio owner
I want to upload, reorder, and delete studio images
So that I can visually showcase my space
```

**Acceptance Criteria:**
- Can upload up to 10 images (Cloudinary integration)
- Can drag-and-drop to reorder images
- Can set alt text for accessibility
- Can delete images with confirmation
- First image is featured/primary
- Image optimization happens automatically
- Loading states for uploads

---

**US-005: Configure Rate Information**
```
As a studio owner
I want to set my pricing tiers and control rate visibility
So that clients understand my pricing structure
```

**Acceptance Criteria:**
- Can set up to 3 rate tiers (£/hour format)
- Can add descriptive text for each tier
- Can toggle whether to show rates publicly
- Rates display with clear formatting
- Changes preview in real-time

---

### Epic 3: Social & Professional Presence

**US-006: Manage Social Media Links**
```
As a studio owner
I want to add links to my social media profiles
So that clients can connect with me on multiple platforms
```

**Acceptance Criteria:**
- Can add links for: Facebook, Twitter, LinkedIn, Instagram, YouTube, Vimeo, SoundCloud
- URL validation ensures correct format
- Invalid URLs show helpful error messages
- Links open in new tabs on profile page
- Can remove links by clearing field

---

**US-007: Configure Communication Methods**
```
As a studio owner
I want to indicate which communication methods I support
So that clients know how they can work with me remotely
```

**Acceptance Criteria:**
- Can toggle support for: Source Connect, Source Connect Now, ipDTL, Session Link Pro, Clean Feed, Zoom, Teams, Skype
- Selections display with icons on profile
- Help text explains each method
- Can toggle all on/off with master switch

---

### Epic 4: Profile Preview & Publishing

**US-008: Preview Profile Changes**
```
As a studio owner
I want to preview my profile before saving changes
So that I can ensure everything looks correct
```

**Acceptance Criteria:**
- Preview button opens profile in new tab
- Preview shows unsaved changes
- Preview matches exact public view
- Can switch between preview and edit mode
- No changes are published until saved

---

**US-009: Save and Publish Changes**
```
As a studio owner
I want to save my profile changes with confidence
So that my updates go live immediately
```

**Acceptance Criteria:**
- Save button prominently displayed
- Loading state during save operation
- Success confirmation on save
- Error messages for failed saves
- Automatic retry for transient failures
- Can save and continue editing

---

## ⚙️ Functional Requirements

### FR-1: Dashboard Layout

**FR-1.1: Navigation Structure**
- Tabbed interface for organizing profile sections
- Persistent navigation showing current/completed status
- Mobile-responsive hamburger menu for tabs
- Breadcrumb showing current section

**FR-1.2: Section Organization**
```
1. Overview (Dashboard home)
   - Profile completion percentage
   - Quick stats (views, messages, reviews)
   - Recent activity feed
   - Quick action buttons

2. Basic Info
   - Studio name
   - Display name
   - Username
   - Email
   - Studio types
   - Short about
   - Full about

3. Contact & Location
   - Phone number
   - Website URL
   - Address
   - Location/Region
   - Visibility toggles

4. Images & Gallery
   - Upload interface
   - Image grid with drag-drop
   - Alt text editor
   - Delete functionality

5. Rates & Pricing
   - Rate tier 1, 2, 3
   - Show/hide rates toggle
   - Pricing notes

6. Social Media
   - Facebook, Twitter, LinkedIn
   - Instagram, YouTube, Vimeo
   - SoundCloud
   - Other professional links

7. Communication Methods
   - Source Connect variants
   - ipDTL, Session Link Pro
   - Clean Feed, Zoom, Teams, Skype
   - Custom methods

8. Settings
   - Visibility controls
   - Privacy settings
   - Notification preferences
   - Account settings (view only)
```

---

### FR-2: Form Controls & Validation

**FR-2.1: Input Types**
- **Text Inputs:** Name, location, URLs
- **Textareas:** Descriptions, about sections
- **Number Inputs:** Rates (formatted as currency)
- **Checkboxes:** Studio types, visibility toggles, connection methods
- **File Uploads:** Images (drag-drop and click-to-browse)
- **Toggle Switches:** Boolean settings (show/hide features)

**FR-2.2: Validation Rules**
| Field | Rules | Error Message |
|-------|-------|---------------|
| Studio Name | Required, max 30 chars | "Studio name is required (max 30 characters)" |
| Email | Required, valid email format | "Please enter a valid email address" |
| Username | Required, alphanumeric + underscore, unique | "Username must be unique and contain only letters, numbers, and underscores" |
| Phone | Optional, valid phone format | "Please enter a valid phone number" |
| Website URL | Optional, valid URL format | "Please enter a valid URL (starting with http:// or https://)" |
| Studio Types | At least 1 selected | "Please select at least one studio type" |
| Rate Tiers | Optional, positive number | "Rate must be a positive number" |
| Images | Max 10, supported formats (JPG, PNG, WebP), max 5MB each | "Maximum 10 images allowed. Supported formats: JPG, PNG, WebP. Max size: 5MB per image" |

**FR-2.3: Real-Time Validation**
- Inline validation as user types
- Error messages appear below fields
- Success indicators (green checkmarks) for valid fields
- Field highlighting for errors (red border)
- Character counters for limited fields

---

### FR-3: Image Management

**FR-3.1: Upload Functionality**
- Drag-and-drop zone for image uploads
- Click-to-browse fallback
- Multiple file selection support
- Preview thumbnails before upload
- Progress bars for uploads
- Cloudinary integration for storage

**FR-3.2: Image Organization**
- Grid display of uploaded images
- Drag-and-drop reordering
- First image automatically set as featured
- Sort order persists to database (sort_order field)

**FR-3.3: Image Editing**
- Alt text editor for accessibility
- Caption/description field (optional)
- Delete with confirmation dialog
- Replace image functionality

**FR-3.4: Image Display**
- Responsive grid (2 columns mobile, 4 columns desktop)
- Hover effects showing actions
- Loading skeleton during fetch
- Empty state with upload prompt

---

### FR-4: Data Persistence

**FR-4.1: Auto-Save Behavior**
- **Option 1 (Recommended):** Manual save with unsaved changes warning
- **Option 2:** Auto-save draft every 30 seconds
- **Option 3:** Hybrid - auto-save drafts, manual publish

**FR-4.2: Save Operations**
- Optimistic UI updates (immediate feedback)
- API call for actual save
- Rollback on failure
- Retry logic for network errors
- Success/error toast notifications

**FR-4.3: Data Synchronization**
- All changes update both `users`, `user_profiles`, and `studios` tables
- Related data (studio_types, studio_services, studio_images) updated atomically
- Metadata stored in appropriate tables
- No data loss on partial updates

---

### FR-5: Visibility Controls

**FR-5.1: Contact Information**
Users can toggle visibility for:
- ☑️ Email address (always obfuscated from bots)
- ☑️ Phone number
- ☑️ Address (full street address)
- ☑️ Location (general area/region)
- ☑️ Website URL

**FR-5.2: Location Display**
Users can control:
- ☑️ Show embedded map
- ☑️ Show directions link
- ☑️ Show exact address vs. general location

**FR-5.3: Pricing Information**
Users can toggle:
- ☑️ Show rate information on profile
- Individual tier visibility (if rates shown)

**FR-5.4: Profile Sections**
Users can hide entire sections:
- ☑️ Short about
- ☑️ Equipment list
- ☑️ Social media links
- ☑️ Communication methods

---

## 🛠️ Technical Requirements

### TR-1: Technology Stack

**Frontend:**
- Next.js 15.5.4 (App Router)
- React 18+ with TypeScript
- Tailwind CSS v4 for styling
- Lucide React for icons
- React Hook Form for form management
- Zod for schema validation

**Backend:**
- Next.js API Routes
- Prisma ORM for database access
- PostgreSQL (existing production database)
- NextAuth.js for authentication

**External Services:**
- Cloudinary for image storage and optimization
- Pusher (optional) for real-time updates

---

### TR-2: Database Schema Reference

**⚠️ CRITICAL: NO DATABASE MODIFICATIONS**
The development environment uses the production database. All development must work with the existing schema.

**Existing Tables Used:**

```typescript
// users (authentication & basic info)
{
  id: string
  email: string
  username: string
  display_name: string
  avatar_url?: string
  role: Role
  email_verified: boolean
  password: string
  created_at: DateTime
  updated_at: DateTime
}

// user_profiles (extended profile data)
{
  id: string
  user_id: string (FK -> users.id)
  last_name?: string
  phone?: string
  about?: string (full description)
  short_about?: string (brief description)
  location?: string
  
  // Rates
  rate_tier_1?: Decimal
  rate_tier_2?: Decimal
  rate_tier_3?: Decimal
  show_rates: boolean
  
  // Social media
  facebook_url?: string
  twitter_url?: string
  linkedin_url?: string
  instagram_url?: string
  youtube_url?: string
  vimeo_url?: string
  soundcloud_url?: string
  
  // Communication methods (stored as '0' or '1' strings)
  connection1?: string // Source Connect
  connection2?: string // Source Connect Now
  connection3?: string // ipDTL
  connection4?: string // Session Link Pro
  connection5?: string // Clean Feed
  connection6?: string // Zoom
  connection7?: string // Teams
  connection8?: string // Skype
  
  // Display settings
  show_email: boolean
  show_phone: boolean
  show_address: boolean
  
  // Professional details
  is_crb_checked: boolean
  is_featured: boolean
  is_spotlight: boolean
  verification_level: string
  home_studio_description?: string
  equipment_list?: string
  services_offered?: string
  studio_name?: string
  
  created_at: DateTime
  updated_at: DateTime
}

// studios (studio information)
{
  id: string
  owner_id: string (FK -> users.id)
  name: string
  description?: string
  address?: string
  latitude?: Decimal
  longitude?: Decimal
  website_url?: string
  phone?: string
  is_premium: boolean
  is_verified: boolean
  status: StudioStatus (ACTIVE, INACTIVE, PENDING)
  created_at: DateTime
  updated_at: DateTime
}

// studio_studio_types (many-to-many)
{
  id: string
  studio_id: string (FK -> studios.id)
  studio_type: StudioType (HOME, RECORDING, EDITING, VO_COACH, PODCAST, VOICEOVER)
}

// studio_services (many-to-many)
{
  id: string
  studio_id: string (FK -> studios.id)
  service: ServiceType (enum of available services)
}

// studio_images (image gallery)
{
  id: string
  studio_id: string (FK -> studios.id)
  image_url: string (Cloudinary URL)
  alt_text?: string
  sort_order: number
  created_at: DateTime
}

// user_metadata (key-value storage)
{
  id: string
  user_id: string (FK -> users.id)
  key: string
  value: string
  created_at: DateTime
  updated_at: DateTime
}
```

**Data Relationships:**
- One user → One user_profile
- One user → Many studios (typically one active)
- One studio → Many studio_studio_types
- One studio → Many studio_services
- One studio → Many studio_images
- One user → Many user_metadata entries

---

### TR-3: API Endpoints

**Base URL:** `/api/user/profile`

**GET /api/user/profile**
```typescript
// Fetch current user's complete profile
Response: {
  user: {
    id: string
    email: string
    username: string
    display_name: string
    avatar_url?: string
    role: string
  }
  profile: {
    // All user_profiles fields
    ...UserProfile
  }
  studio: {
    // All studios fields
    ...Studio
    studio_types: StudioType[]
    services: ServiceType[]
    images: StudioImage[]
  }
  metadata: {
    [key: string]: string
  }
}
```

**PUT /api/user/profile**
```typescript
// Update user profile (partial update supported)
Request Body: {
  user?: {
    display_name?: string
    username?: string
    // email changes require verification
  }
  profile?: {
    // Any user_profiles fields
    phone?: string
    about?: string
    short_about?: string
    location?: string
    rate_tier_1?: number
    rate_tier_2?: number
    rate_tier_3?: number
    show_rates?: boolean
    facebook_url?: string
    // ... other fields
  }
  studio?: {
    name?: string
    description?: string
    address?: string
    website_url?: string
    phone?: string
  }
  studio_types?: StudioType[]
  services?: ServiceType[]
  display_settings?: {
    show_email?: boolean
    show_phone?: boolean
    show_address?: boolean
    show_map?: boolean
    show_directions?: boolean
  }
  connection_methods?: {
    connection1?: '0' | '1'
    connection2?: '0' | '1'
    // ... other connections
  }
}

Response: {
  success: boolean
  message: string
  data?: UpdatedProfile
}
```

**POST /api/user/profile/images**
```typescript
// Upload new studio image
Request: FormData {
  file: File
  alt_text?: string
  sort_order?: number
}

Response: {
  success: boolean
  image: {
    id: string
    image_url: string
    alt_text: string
    sort_order: number
  }
}
```

**PUT /api/user/profile/images/reorder**
```typescript
// Reorder studio images
Request Body: {
  images: Array<{
    id: string
    sort_order: number
  }>
}

Response: {
  success: boolean
  message: string
}
```

**DELETE /api/user/profile/images/:id**
```typescript
// Delete studio image
Response: {
  success: boolean
  message: string
}
```

**PUT /api/user/profile/images/:id**
```typescript
// Update image alt text or metadata
Request Body: {
  alt_text?: string
}

Response: {
  success: boolean
  image: StudioImage
}
```

---

### TR-4: Authentication & Authorization

**Authentication:**
- All endpoints require authenticated user (NextAuth session)
- Session verified via middleware
- Token refresh handled automatically

**Authorization:**
- Users can ONLY edit their own profile
- Verified by matching `session.user.id` with `studio.owner_id`
- Admin users (role: ADMIN) have override capability (future enhancement)
- No guest/anonymous access allowed

**Security Measures:**
- CSRF protection on all mutations
- Rate limiting on API endpoints (10 requests/minute for updates)
- Input sanitization on all text fields
- File upload validation (type, size, content)
- SQL injection prevention via Prisma
- XSS prevention via React's built-in escaping

---

### TR-5: Performance Requirements

**Page Load:**
- Initial dashboard load: < 2 seconds
- Tab switching: < 500ms
- Image loading: Progressive (thumbnails first)

**API Response Times:**
- GET /api/user/profile: < 500ms
- PUT /api/user/profile: < 1 second
- Image upload: < 5 seconds (for 5MB file)

**Caching Strategy:**
- Client-side caching of profile data (React Query / SWR)
- Stale-while-revalidate for non-critical data
- No caching for real-time data (messages, notifications)

**Optimization:**
- Lazy loading for non-visible tabs
- Debounced validation (300ms)
- Image compression before upload
- Pagination for large datasets (reviews, analytics)

---

## 🎨 UI/UX Design Specifications

### DS-1: Layout Structure

**Desktop Layout (1024px+):**
```
┌─────────────────────────────────────────────────────────┐
│ Header (Fixed)                                          │
│ [Logo]                    [User Menu] [Notifications]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────┬─────────────────────────────────────┐ │
│ │   Sidebar   │   Main Content Area                 │ │
│ │             │                                     │ │
│ │ [Overview]  │   ┌─────────────────────────────┐   │ │
│ │  Basic Info │   │                             │   │ │
│ │  Contact    │   │   Tab Content               │   │ │
│ │  Images     │   │                             │   │ │
│ │  Rates      │   │                             │   │ │
│ │  Social     │   │                             │   │ │
│ │  Connections│   │                             │   │ │
│ │  Settings   │   │                             │   │ │
│ │             │   └─────────────────────────────┘   │ │
│ │ [Preview]   │                                     │ │
│ │ [Save]      │   [Save Changes] [Preview Profile]  │ │
│ └─────────────┴─────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Mobile Layout (< 768px):**
```
┌──────────────────────────┐
│ Header                   │
│ [☰] [Title] [User]       │
├──────────────────────────┤
│                          │
│ ┌────────────────────┐   │
│ │  Tab Selector      │   │
│ │ [▼ Basic Info]     │   │
│ └────────────────────┘   │
│                          │
│ ┌────────────────────┐   │
│ │                    │   │
│ │   Tab Content      │   │
│ │                    │   │
│ │                    │   │
│ └────────────────────┘   │
│                          │
│ [Save] [Preview]         │
│                          │
└──────────────────────────┘
```

---

### DS-2: Component Design

**Color Palette (Inheriting from existing design):**
```css
/* Primary */
--primary-600: #7c3aed (purple)
--primary-700: #6d28d9
--primary-800: #5b21b6

/* Success */
--success-600: #059669 (green)

/* Warning */
--warning-600: #d97706 (orange)

/* Error */
--error-600: #dc2626 (red)

/* Neutral */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-500: #6b7280
--gray-700: #374151
--gray-900: #111827

/* Text */
--text-primary: #111827
--text-secondary: #6b7280
```

**Typography:**
```css
/* Headings */
h1: 2xl (text-2xl) - 24px - font-bold
h2: xl (text-xl) - 20px - font-semibold
h3: lg (text-lg) - 18px - font-medium
h4: base (text-base) - 16px - font-medium

/* Body */
body: base (text-base) - 16px - font-normal
small: sm (text-sm) - 14px - font-normal
tiny: xs (text-xs) - 12px - font-normal
```

**Spacing:**
- Section padding: 6 (24px)
- Element gap: 4 (16px)
- Input padding: 3 (12px)
- Button padding: 2.5 (10px) vertical, 4 (16px) horizontal

---

### DS-3: Component Specifications

**Input Fields:**
```tsx
// Standard Text Input
<div className="space-y-1">
  <label className="block text-sm font-medium text-gray-700">
    Field Name
    <span className="text-red-600 ml-1">*</span>
  </label>
  <input
    type="text"
    className="w-full px-3 py-2 border border-gray-300 rounded-md 
               focus:outline-none focus:ring-2 focus:ring-primary-500 
               focus:border-transparent"
    placeholder="Enter value..."
  />
  <p className="text-xs text-gray-500">Helpful hint text</p>
</div>

// Input with Character Counter
<div className="space-y-1">
  <div className="flex justify-between items-center">
    <label className="text-sm font-medium text-gray-700">Studio Name</label>
    <span className="text-xs text-gray-400">24/30</span>
  </div>
  <input type="text" maxLength={30} className="..." />
</div>

// Input with Error State
<div className="space-y-1">
  <label className="text-sm font-medium text-gray-700">Email</label>
  <input
    type="email"
    className="w-full px-3 py-2 border-2 border-red-500 rounded-md
               focus:outline-none focus:ring-2 focus:ring-red-500"
  />
  <p className="text-xs text-red-600 flex items-center">
    <AlertCircle className="w-3 h-3 mr-1" />
    Please enter a valid email address
  </p>
</div>
```

**Buttons:**
```tsx
// Primary Button
<button className="px-4 py-2 bg-primary-600 text-white rounded-md 
                   hover:bg-primary-700 focus:outline-none focus:ring-2 
                   focus:ring-primary-500 focus:ring-offset-2 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors">
  Save Changes
</button>

// Secondary Button
<button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 
                   rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 
                   focus:ring-primary-500 focus:ring-offset-2">
  Cancel
</button>

// Danger Button
<button className="px-4 py-2 bg-red-600 text-white rounded-md 
                   hover:bg-red-700 focus:outline-none focus:ring-2 
                   focus:ring-red-500 focus:ring-offset-2">
  Delete Image
</button>
```

**Toggle Switches:**
```tsx
<div className="flex items-center justify-between">
  <div>
    <label className="text-sm font-medium text-gray-700">Show Email</label>
    <p className="text-xs text-gray-500">Display email on public profile</p>
  </div>
  <button
    role="switch"
    aria-checked={isEnabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors focus:outline-none focus:ring-2 
                focus:ring-primary-500 focus:ring-offset-2
                ${isEnabled ? 'bg-primary-600' : 'bg-gray-200'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white 
                  transition-transform
                  ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`}
    />
  </button>
</div>
```

**Image Upload Zone:**
```tsx
<div className="border-2 border-dashed border-gray-300 rounded-lg p-8 
                text-center hover:border-primary-500 transition-colors
                cursor-pointer">
  <div className="space-y-2">
    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
    <div>
      <p className="text-sm font-medium text-gray-700">
        Drop images here or click to browse
      </p>
      <p className="text-xs text-gray-500">
        PNG, JPG, WebP up to 5MB (max 10 images)
      </p>
    </div>
  </div>
</div>
```

**Image Grid Item:**
```tsx
<div className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
  <img
    src={image.url}
    alt={image.alt_text}
    className="w-full h-full object-cover"
  />
  
  {/* Hover Overlay */}
  <div className="absolute inset-0 bg-black/50 opacity-0 
                  group-hover:opacity-100 transition-opacity
                  flex items-center justify-center gap-2">
    <button className="p-2 bg-white rounded-full hover:bg-gray-100">
      <Edit className="w-4 h-4" />
    </button>
    <button className="p-2 bg-white rounded-full hover:bg-gray-100">
      <Trash2 className="w-4 h-4 text-red-600" />
    </button>
  </div>
  
  {/* Sort Order Badge */}
  <div className="absolute top-2 left-2 w-6 h-6 bg-primary-600 
                  text-white text-xs font-bold rounded-full 
                  flex items-center justify-center">
    {image.sort_order + 1}
  </div>
</div>
```

**Progress Indicator:**
```tsx
// Profile Completion Meter
<div className="bg-white p-6 rounded-lg border border-gray-200">
  <div className="flex justify-between items-center mb-2">
    <h3 className="text-sm font-medium text-gray-700">Profile Completion</h3>
    <span className="text-sm font-bold text-primary-600">75%</span>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-primary-600 h-2 rounded-full transition-all"
      style={{ width: '75%' }}
    />
  </div>
  <p className="text-xs text-gray-500 mt-2">
    Add 3 more images to reach 100%
  </p>
</div>
```

**Toast Notifications:**
```tsx
// Success Toast
<div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 
                rounded-lg shadow-lg flex items-center gap-3 animate-slide-in">
  <CheckCircle className="w-5 h-5" />
  <div>
    <p className="font-medium">Changes saved successfully!</p>
    <p className="text-sm opacity-90">Your profile has been updated</p>
  </div>
  <button className="ml-4">
    <X className="w-4 h-4" />
  </button>
</div>

// Error Toast
<div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 
                rounded-lg shadow-lg flex items-center gap-3">
  <AlertCircle className="w-5 h-5" />
  <div>
    <p className="font-medium">Save failed</p>
    <p className="text-sm opacity-90">Please try again</p>
  </div>
</div>
```

---

### DS-4: Interaction Patterns

**Tab Navigation:**
- Click tab to switch content
- Active tab highlighted with bottom border (primary color)
- Smooth transition between tabs (fade in/out)
- URL updates with hash (#basic-info, #images, etc.)
- Browser back button navigates between tabs

**Form Interactions:**
- Auto-focus first field on tab open
- Tab key moves between fields in logical order
- Enter key submits form (if in single-line input)
- Escape key closes modals/dialogs
- Ctrl/Cmd+S saves form (keyboard shortcut)

**Drag and Drop:**
- Hover state shows drop zone highlight
- Dragged item shows ghost image
- Drop target shows insertion indicator
- Smooth animation on drop
- Immediate visual feedback

**Image Upload:**
- Click to browse OR drag-drop
- Multiple file selection supported
- Preview thumbnails appear immediately
- Upload progress bar for each image
- Success/error state for each upload

**Unsaved Changes:**
- Warning modal on navigation attempt
- "Save" and "Discard" options
- Highlight unsaved sections (dot indicator)
- Auto-save draft option (configurable)

---

## 📊 Data Model Reference

### Existing Database Schema

**Important: This section documents the EXISTING schema. NO MODIFICATIONS are permitted.**

```sql
-- Tables involved in profile management (READ ONLY - NO MODIFICATIONS)

-- Primary user table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  email_verified BOOLEAN DEFAULT false,
  password TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Extended profile information
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  last_name TEXT,
  phone TEXT,
  about TEXT,
  short_about TEXT,
  location TEXT,
  
  -- Pricing
  rate_tier_1 DECIMAL(10,2),
  rate_tier_2 DECIMAL(10,2),
  rate_tier_3 DECIMAL(10,2),
  show_rates BOOLEAN DEFAULT false,
  
  -- Social media
  facebook_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  vimeo_url TEXT,
  soundcloud_url TEXT,
  
  -- Communication methods (stored as '0' or '1')
  connection1 TEXT,
  connection2 TEXT,
  connection3 TEXT,
  connection4 TEXT,
  connection5 TEXT,
  connection6 TEXT,
  connection7 TEXT,
  connection8 TEXT,
  
  -- Visibility settings
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  show_address BOOLEAN DEFAULT false,
  
  -- Additional fields
  is_crb_checked BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_spotlight BOOLEAN DEFAULT false,
  verification_level TEXT,
  home_studio_description TEXT,
  equipment_list TEXT,
  services_offered TEXT,
  studio_name TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Studio information (typically 1 per user)
CREATE TABLE studios (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  website_url TEXT,
  phone TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Studio type associations
CREATE TABLE studio_studio_types (
  id TEXT PRIMARY KEY,
  studio_id TEXT REFERENCES studios(id) ON DELETE CASCADE,
  studio_type TEXT NOT NULL
);

-- Studio service offerings
CREATE TABLE studio_services (
  id TEXT PRIMARY KEY,
  studio_id TEXT REFERENCES studios(id) ON DELETE CASCADE,
  service TEXT NOT NULL
);

-- Studio images
CREATE TABLE studio_images (
  id TEXT PRIMARY KEY,
  studio_id TEXT REFERENCES studios(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Key-value metadata
CREATE TABLE user_metadata (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Data Flow Diagram

```
User Dashboard Interface
         │
         ├─── GET /api/user/profile ────────┐
         │                                    │
         │                                    ▼
         │                          ┌─────────────────┐
         │                          │  NextAuth       │
         │                          │  Verify Session │
         │                          └────────┬────────┘
         │                                   │
         │                                   ▼
         │                          ┌─────────────────┐
         │                          │  Prisma ORM     │
         │                          │  Fetch Profile  │
         │                          └────────┬────────┘
         │                                   │
         │                                   ▼
         │                          ┌─────────────────┐
         │         ┌────────────────┤  Database       │
         │         │                │  - users        │
         │         │                │  - user_profiles│
         │         │                │  - studios      │
         │         │                │  - studio_*     │
         │         │                └─────────────────┘
         │         │
         │         └────── Serialize & Return ───────┐
         │                                            │
         │                                            ▼
         └────── Render UI with Data ◄────────── { profile }
                        │
                        │
                        ├─── User Edits Data
                        │
                        ▼
                 PUT /api/user/profile
                        │
                        ├─── Validate Input (Zod)
                        ├─── Verify Ownership
                        ├─── Update Database (Prisma)
                        │    ├─── UPDATE users
                        │    ├─── UPDATE user_profiles
                        │    ├─── UPDATE studios
                        │    └─── UPDATE studio_* (types, services, images)
                        │
                        └─── Return Success/Error
```

---

## 🔌 API Requirements

### API-1: Profile Management Endpoints

**Endpoint:** `GET /api/user/profile`

**Purpose:** Fetch complete profile data for authenticated user

**Request:**
- No body required
- Authentication via NextAuth session cookie

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "john@example.com",
      "username": "VoiceoverGuy",
      "display_name": "John Smith",
      "avatar_url": "https://cloudinary.com/...",
      "role": "STUDIO_OWNER"
    },
    "profile": {
      "id": "prof_xyz789",
      "user_id": "usr_abc123",
      "phone": "+44 1234 567890",
      "about": "Professional voiceover artist with 10 years experience...",
      "short_about": "Award-winning voiceover professional",
      "location": "Yorkshire, UK",
      "rate_tier_1": 100.00,
      "rate_tier_2": 150.00,
      "rate_tier_3": 200.00,
      "show_rates": true,
      "facebook_url": "https://facebook.com/voiceover",
      "linkedin_url": "https://linkedin.com/in/voiceover",
      "connection1": "1",
      "connection2": "1",
      "connection6": "1",
      "show_email": true,
      "show_phone": true,
      "show_address": false,
      "studio_name": "VoiceoverGuy Studio",
      "equipment_list": "Neumann U87, TLM 103, Apollo X4",
      "services_offered": "Commercials, Narration, E-learning"
    },
    "studio": {
      "id": "std_def456",
      "owner_id": "usr_abc123",
      "name": "VoiceoverGuy Studio",
      "description": "Professional recording studio in Yorkshire",
      "address": "123 Studio Lane, Yorkshire, YO1 1AA",
      "latitude": 53.9591,
      "longitude": -1.0815,
      "website_url": "https://voiceoverbuy.com",
      "phone": "+44 1234 567890",
      "is_premium": true,
      "is_verified": true,
      "status": "ACTIVE",
      "studio_types": [
        { "id": "typ_1", "studio_type": "HOME" },
        { "id": "typ_2", "studio_type": "VOICEOVER" }
      ],
      "services": [
        { "id": "srv_1", "service": "RECORDING" },
        { "id": "srv_2", "service": "EDITING" }
      ],
      "images": [
        {
          "id": "img_1",
          "image_url": "https://res.cloudinary.com/...",
          "alt_text": "Main studio space",
          "sort_order": 0
        },
        {
          "id": "img_2",
          "image_url": "https://res.cloudinary.com/...",
          "alt_text": "Recording booth",
          "sort_order": 1
        }
      ]
    },
    "metadata": {
      "custom_field_1": "value",
      "custom_field_2": "value"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: No active session
- `404 Not Found`: User profile doesn't exist
- `500 Internal Server Error`: Database error

---

**Endpoint:** `PUT /api/user/profile`

**Purpose:** Update user profile (supports partial updates)

**Request Body:**
```json
{
  "user": {
    "display_name": "John Smith",
    "username": "VoiceoverGuy"
  },
  "profile": {
    "phone": "+44 1234 567890",
    "short_about": "Updated description",
    "about": "Full updated bio...",
    "location": "Yorkshire, UK",
    "rate_tier_1": 120.00,
    "show_rates": true,
    "facebook_url": "https://facebook.com/newpage",
    "linkedin_url": "https://linkedin.com/in/newprofile",
    "connection1": "1",
    "connection2": "0",
    "show_email": true,
    "show_phone": false,
    "equipment_list": "Updated equipment list",
    "services_offered": "Updated services"
  },
  "studio": {
    "name": "Updated Studio Name",
    "description": "Updated studio description",
    "address": "New address",
    "website_url": "https://newsite.com",
    "phone": "+44 9876 543210"
  },
  "studio_types": ["HOME", "VOICEOVER", "EDITING"],
  "services": ["RECORDING", "MIXING", "MASTERING"],
  "display_settings": {
    "show_email": true,
    "show_phone": false,
    "show_address": false
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    // Full updated profile (same structure as GET)
  }
}
```

**Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "studio.name",
      "message": "Studio name must be between 2 and 30 characters"
    },
    {
      "field": "profile.rate_tier_1",
      "message": "Rate must be a positive number"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: No active session
- `403 Forbidden`: User doesn't own this profile
- `409 Conflict`: Username already taken
- `500 Internal Server Error`: Database error

---

### API-2: Image Management Endpoints

**Endpoint:** `POST /api/user/profile/images`

**Purpose:** Upload new studio image

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  ```
  file: [binary image data]
  alt_text: "Description of image"
  ```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "id": "img_new123",
    "image_url": "https://res.cloudinary.com/...",
    "alt_text": "Studio booth interior",
    "sort_order": 5,
    "created_at": "2025-01-11T10:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file type, file too large, or max images exceeded
- `401 Unauthorized`: No active session
- `403 Forbidden`: User doesn't own this studio
- `413 Payload Too Large`: File exceeds 5MB limit
- `500 Internal Server Error`: Upload or database error

---

**Endpoint:** `PUT /api/user/profile/images/reorder`

**Purpose:** Reorder studio images after drag-and-drop

**Request Body:**
```json
{
  "images": [
    { "id": "img_1", "sort_order": 0 },
    { "id": "img_3", "sort_order": 1 },
    { "id": "img_2", "sort_order": 2 },
    { "id": "img_4", "sort_order": 3 }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Images reordered successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid image IDs or sort_order values
- `401 Unauthorized`: No active session
- `403 Forbidden`: User doesn't own these images
- `500 Internal Server Error`: Database error

---

**Endpoint:** `PUT /api/user/profile/images/:id`

**Purpose:** Update image alt text or metadata

**Request Body:**
```json
{
  "alt_text": "Updated description of image"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Image updated successfully",
  "data": {
    "id": "img_123",
    "image_url": "https://res.cloudinary.com/...",
    "alt_text": "Updated description",
    "sort_order": 2
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid data
- `401 Unauthorized`: No active session
- `403 Forbidden`: User doesn't own this image
- `404 Not Found`: Image doesn't exist
- `500 Internal Server Error`: Database error

---

**Endpoint:** `DELETE /api/user/profile/images/:id`

**Purpose:** Delete studio image

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: No active session
- `403 Forbidden`: User doesn't own this image
- `404 Not Found`: Image doesn't exist
- `500 Internal Server Error`: Database or Cloudinary deletion error

---

### API-3: Validation & Business Rules

**Username Validation:**
```typescript
const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
  .refine(
    async (username) => {
      const existing = await db.users.findUnique({ where: { username } });
      return !existing || existing.id === currentUserId;
    },
    "Username is already taken"
  );
```

**Studio Name Validation:**
```typescript
const studioNameSchema = z
  .string()
  .min(2, "Studio name must be at least 2 characters")
  .max(30, "Studio name must be less than 30 characters")
  .trim();
```

**URL Validation:**
```typescript
const urlSchema = z
  .string()
  .url("Please enter a valid URL")
  .regex(/^https?:\/\//, "URL must start with http:// or https://")
  .optional()
  .or(z.literal(""));
```

**Rate Validation:**
```typescript
const rateSchema = z
  .number()
  .positive("Rate must be a positive number")
  .max(9999.99, "Rate cannot exceed £9,999.99")
  .optional();
```

**Image Upload Validation:**
```typescript
const imageSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB")
    .refine(
      (file) => ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type),
      "File must be JPG, PNG, or WebP"
    ),
  alt_text: z.string().max(255, "Alt text must be less than 255 characters").optional(),
});

// Business rule: Max 10 images per studio
const validateImageCount = async (studioId: string) => {
  const count = await db.studio_images.count({ where: { studio_id: studioId } });
  if (count >= 10) {
    throw new Error("Maximum of 10 images allowed per studio");
  }
};
```

**Phone Number Validation:**
```typescript
const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format")
  .min(10, "Phone number must be at least 10 digits")
  .max(20, "Phone number must be less than 20 characters")
  .optional()
  .or(z.literal(""));
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)

**Deliverables:**
- [ ] API endpoint: `GET /api/user/profile`
- [ ] API endpoint: `PUT /api/user/profile`
- [ ] Dashboard page layout component
- [ ] Tab navigation system
- [ ] Authentication & authorization middleware
- [ ] Basic form components (inputs, textareas, buttons)

**Tasks:**
1. Create `/api/user/profile/route.ts`
   - Implement GET handler with Prisma queries
   - Implement PUT handler with validation
   - Add authentication check
   - Add ownership verification
   
2. Create `/src/app/dashboard/page.tsx`
   - Implement layout structure
   - Add session check
   - Fetch profile data on load
   - Handle loading/error states

3. Create `src/components/dashboard/DashboardLayout.tsx`
   - Sidebar navigation
   - Mobile responsive menu
   - Tab state management
   - URL hash synchronization

4. Create base form components
   - `Input.tsx`, `Textarea.tsx`, `Button.tsx`
   - `Toggle.tsx`, `Checkbox.tsx`
   - Form error displays

**Testing:**
- Unit tests for validation schemas
- API endpoint tests (GET/PUT)
- Component rendering tests
- Authentication flow tests

---

### Phase 2: Core Profile Editing (Week 2)

**Deliverables:**
- [ ] Basic Info tab (complete and functional)
- [ ] Contact & Location tab (complete and functional)
- [ ] Form validation with Zod
- [ ] Real-time error messages
- [ ] Save functionality with success/error toasts
- [ ] Profile preview link

**Tasks:**
1. Build "Basic Info" tab component
   - Studio name field (with counter)
   - Display name field
   - Username field (with uniqueness check)
   - Email field (with verification notice)
   - Studio types checkboxes
   - Short about input
   - Full about textarea
   
2. Build "Contact & Location" tab component
   - Phone number field
   - Website URL field
   - Address field
   - Location/region field
   - Visibility toggles section

3. Implement form state management
   - React Hook Form integration
   - Zod schema validation
   - Error state handling
   - Unsaved changes detection

4. Add save functionality
   - API call on form submit
   - Optimistic UI updates
   - Success/error toasts
   - Loading states

**Testing:**
- Form validation tests
- Save operation tests
- Error handling tests
- UI state tests

---

### Phase 3: Image Management (Week 3)

**Deliverables:**
- [ ] Image upload API endpoints
- [ ] Image gallery component
- [ ] Drag-and-drop upload
- [ ] Drag-and-drop reordering
- [ ] Image editing (alt text)
- [ ] Image deletion with confirmation
- [ ] Cloudinary integration

**Tasks:**
1. Create image management API endpoints
   - `POST /api/user/profile/images` (upload)
   - `PUT /api/user/profile/images/reorder` (reorder)
   - `PUT /api/user/profile/images/:id` (update alt text)
   - `DELETE /api/user/profile/images/:id` (delete)

2. Build image gallery component
   - Grid layout (responsive)
   - Empty state with upload prompt
   - Image card component
   - Hover actions (edit, delete)
   - Sort order badges

3. Implement upload functionality
   - Drag-and-drop zone
   - File input fallback
   - Multiple file selection
   - Upload progress indicators
   - Preview before upload

4. Implement reordering
   - Drag-and-drop library integration (react-beautiful-dnd or similar)
   - Visual feedback during drag
   - Optimistic reordering
   - API call on drop

5. Implement image editing
   - Alt text modal
   - Delete confirmation dialog
   - Cloudinary deletion

**Testing:**
- Upload flow tests
- Reordering logic tests
- Delete confirmation tests
- Cloudinary integration tests

---

### Phase 4: Advanced Features (Week 4)

**Deliverables:**
- [ ] Rates & Pricing tab
- [ ] Social Media tab
- [ ] Communication Methods tab
- [ ] Settings tab
- [ ] Profile completion indicator
- [ ] Dashboard overview/stats

**Tasks:**
1. Build "Rates & Pricing" tab
   - Three rate tier inputs (formatted as currency)
   - Rate descriptions
   - Show/hide rates toggle
   - Preview how rates display

2. Build "Social Media" tab
   - URL inputs for all platforms
   - Platform icons/logos
   - URL validation per platform
   - Link preview functionality

3. Build "Communication Methods" tab
   - Checkboxes for all methods
   - Method descriptions/tooltips
   - Visual icons for each method
   - Help text explaining each

4. Build "Settings" tab
   - Consolidate all visibility toggles
   - Privacy settings
   - Notification preferences (future)
   - Account settings (view only)

5. Build dashboard overview
   - Profile completion percentage
   - Quick stats (profile views, messages, reviews)
   - Recent activity feed
   - Quick action buttons

**Testing:**
- Tab functionality tests
- Settings persistence tests
- Completion calculation tests
- Overview data tests

---

### Phase 5: Polish & Optimization (Week 5)

**Deliverables:**
- [ ] Mobile responsiveness complete
- [ ] Loading states and skeletons
- [ ] Error boundary implementation
- [ ] Accessibility audit and fixes
- [ ] Performance optimization
- [ ] User testing and feedback incorporation

**Tasks:**
1. Mobile optimization
   - Test all breakpoints
   - Optimize touch interactions
   - Adjust spacing/sizing
   - Hamburger menu for tabs

2. Loading states
   - Skeleton screens for profile load
   - Button loading spinners
   - Upload progress indicators
   - Inline field loading (username check)

3. Error handling
   - Error boundary components
   - Fallback UI for errors
   - Network error recovery
   - Validation error displays

4. Accessibility
   - Keyboard navigation
   - ARIA labels and roles
   - Focus management
   - Screen reader testing

5. Performance
   - Code splitting by tab
   - Image lazy loading
   - Debounced validation
   - Memoization of expensive operations

**Testing:**
- Mobile device testing (iOS/Android)
- Accessibility audit (axe, WAVE)
- Performance profiling
- Browser compatibility testing
- User acceptance testing

---

### Phase 6: Launch & Monitor (Week 6)

**Deliverables:**
- [ ] Production deployment
- [ ] User documentation/help guide
- [ ] Analytics integration
- [ ] Monitoring and error tracking
- [ ] Feedback collection system

**Tasks:**
1. Documentation
   - User guide for dashboard
   - Screenshots and tutorials
   - FAQ section
   - Video walkthrough (optional)

2. Analytics
   - Track dashboard visits
   - Track feature usage (by tab)
   - Track save success/fail rates
   - Track completion rates

3. Monitoring
   - Sentry error tracking
   - API endpoint monitoring
   - Performance metrics
   - User feedback collection

4. Deployment
   - Final QA testing
   - Staging environment validation
   - Production deployment
   - Rollback plan

5. Post-launch
   - Monitor user feedback
   - Track success metrics
   - Address critical bugs
   - Plan phase 2 features

**Testing:**
- Final end-to-end tests
- Load testing
- Production smoke tests
- Post-deployment verification

---

## 📈 Success Metrics

### Primary Metrics

**User Engagement:**
- **Dashboard Visits:** Target 80% of active users visit dashboard within first week
- **Profile Updates:** Target 60% of users make at least one update
- **Time on Dashboard:** Average 8-12 minutes per session
- **Return Visits:** 40%+ return within 7 days

**Profile Completeness:**
- **Before Launch:** Average 60% profile completion
- **After 1 Month:** Target 85%+ average completion
- **Image Uploads:** Average 5+ images per profile (from current 2-3)
- **Description Quality:** 80%+ profiles have 100+ word descriptions

**System Performance:**
- **API Response Time:** < 500ms for GET, < 1s for PUT
- **Save Success Rate:** > 98%
- **Upload Success Rate:** > 95%
- **Error Rate:** < 2%

**Support Impact:**
- **Support Tickets:** 50% reduction in profile-related tickets
- **Admin Edits:** 80% reduction in manual admin profile updates
- **User Satisfaction:** 4.5/5 or higher (survey)

### Secondary Metrics

**Feature Adoption:**
- **Visibility Controls:** 60%+ users customize visibility settings
- **Rate Display:** 40%+ users add rate information
- **Social Links:** 70%+ users add at least one social media link
- **Communication Methods:** 50%+ users configure preferred methods

**Quality Indicators:**
- **Form Abandonment:** < 20% abandon mid-update
- **Error Encounters:** < 30% encounter validation errors
- **Help Doc Views:** Track which sections need more clarity
- **Feature Requests:** Categorize and prioritize user feedback

---

## 🔒 Constraints & Assumptions

### Critical Constraints

**1. Database Immutability**
- ⚠️ **NO SCHEMA CHANGES ALLOWED**
- Development uses production database
- All work must use existing tables and columns
- No migrations, no new tables, no new columns
- Must work with existing data types and relationships

**2. Authentication**
- Users must be authenticated via NextAuth
- Session management uses existing system
- No changes to authentication flow
- User permissions based on `session.user.id === studio.owner_id`

**3. User Permissions**
- Users can ONLY edit their own profiles
- No cross-user data access
- Admin override not in Phase 1 (future enhancement)
- Studio ownership must match session user

**4. External Dependencies**
- Cloudinary for image storage (existing account)
- No new third-party services without approval
- Must work with existing API keys/credentials

### Assumptions

**Technical Assumptions:**
- PostgreSQL database will handle increased read/write load
- Cloudinary storage will accommodate increased image uploads
- Next.js 15 API routes support required concurrency
- React 18 features (concurrent mode) are stable
- Vercel deployment platform remains primary hosting

**User Assumptions:**
- Users have basic computer literacy
- Users primarily access from desktop (70%) vs mobile (30%)
- Users are motivated to maintain current profiles
- Users understand benefit of complete profiles for discovery
- Users can follow guided interfaces without extensive documentation

**Business Assumptions:**
- Profile completeness correlates with better discovery/engagement
- Self-service reduces need for admin support
- Feature will increase user satisfaction and retention
- Investment justified by reduced admin workload
- No immediate monetization required (supports existing subscription)

**Data Assumptions:**
- Existing profile data is generally accurate
- Users have rights to images they upload
- Profile information can be publicly displayed (with visibility controls)
- No GDPR-sensitive data requires special handling beyond existing
- User metadata table can accommodate future custom fields

### Risks & Mitigation

**Risk: Database Overload**
- **Mitigation:** Implement rate limiting, optimize queries, add caching layer
- **Monitoring:** Track database CPU/memory usage, query performance

**Risk: Image Storage Costs**
- **Mitigation:** Enforce 10 image limit, compress uploads, set Cloudinary budget alerts
- **Monitoring:** Track storage usage, upload frequency, cost trends

**Risk: User Adoption**
- **Mitigation:** In-app tutorials, email announcements, progressive disclosure
- **Monitoring:** Track dashboard visits, feature usage, abandonment rates

**Risk: Data Validation Bypass**
- **Mitigation:** Server-side validation, input sanitization, CSRF protection
- **Monitoring:** Error logs, suspicious activity patterns

**Risk: Performance Degradation**
- **Mitigation:** Code splitting, lazy loading, debounced operations
- **Monitoring:** Core Web Vitals, API response times, user complaints

---

## 📝 Appendix

### A. Glossary

- **Profile Completeness:** Percentage of required and optional fields filled in
- **Studio Owner:** User with role STUDIO_OWNER who owns at least one active studio
- **Featured Image:** First image in sort order, displayed as primary
- **Visibility Toggle:** Boolean control for showing/hiding profile elements
- **Self-Service:** User-initiated actions without admin intervention
- **Optimistic UI:** UI updates before server confirmation (rolls back on error)

### B. Related Documents

- [Admin Edit Modal Implementation](../src/components/admin/EditStudioModal.tsx)
- [Profile Display Component](../src/components/studio/profile/ModernStudioProfileV3.tsx)
- [Database Schema](../prisma/schema.prisma)
- [User Authentication Flow](../src/lib/auth.ts)
- [Cloudinary Integration](../src/lib/cloudinary.ts)

### C. Open Questions

1. **Image Editing:** Should users be able to crop/rotate images in-browser before upload?
   - *Decision pending*: Phase 2 feature if time permits

2. **Auto-Save:** Manual save vs auto-save drafts vs hybrid approach?
   - *Recommendation*: Manual save with unsaved changes warning (simplest, clearest)

3. **Profile Preview:** Open in new tab vs inline preview panel?
   - *Recommendation*: New tab (matches existing profile URLs)

4. **Notification Preferences:** Include in Phase 1 or defer to Phase 2?
   - *Recommendation*: Defer to Phase 2 (focus on core editing first)

5. **Mobile Image Upload:** Support camera upload on mobile?
   - *Recommendation*: Yes, use standard file input with capture attribute

### D. Future Enhancements (Post-Launch)

**Phase 2 Features:**
- Analytics dashboard (profile views, click-through rates)
- Bulk image upload (upload multiple at once)
- Image editor (crop, rotate, filters)
- Profile templates/themes
- Advanced SEO controls (meta tags, structured data)

**Integration Opportunities:**
- Calendar integration for availability
- Booking system integration
- Portfolio/demo reel embedding
- Client testimonials management
- Project showcase section

**Admin Features:**
- Admin override to edit any profile
- Bulk profile operations
- Profile verification workflow
- Content moderation tools

---

## 🎯 Next Steps

1. **Review & Approval:** Stakeholder review of PRD
2. **Technical Kickoff:** Dev team walkthrough and questions
3. **Design Mockups:** Create high-fidelity designs if needed
4. **Sprint Planning:** Break phases into 2-week sprints
5. **Development Start:** Begin Phase 1 implementation

---

**Document Version:** 1.0  
**Last Updated:** January 11, 2025  
**Status:** ✅ Ready for Review  
**Next Review:** After stakeholder feedback

