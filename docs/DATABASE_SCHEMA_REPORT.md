# Database Schema Report
## VO Studio Finder Database Architecture

**Generated:** November 27, 2025  
**Database:** PostgreSQL (via Prisma ORM)  
**Total Tables:** 19 core tables + 8 enums

---

## Table of Contents
1. [Overview](#overview)
2. [Core Entities](#core-entities)
3. [Relationship Diagram](#relationship-diagram)
4. [Detailed Table Specifications](#detailed-table-specifications)
5. [Enumerations](#enumerations)
6. [Usage Patterns](#usage-patterns)
7. [Indexes and Performance](#indexes-and-performance)

---

## Overview

The VO Studio Finder database is designed to support a professional networking and directory platform for voiceover artists and recording studios. The schema supports:

- **User Management**: Authentication, profiles, roles, and permissions
- **Studio Listings**: Recording studio profiles with rich metadata
- **Reviews & Ratings**: Moderated review system with responses
- **Messaging**: Direct messaging between users
- **Payments**: Stripe/PayPal subscription management
- **Networking**: User connections and professional networking
- **Content Moderation**: Reporting and review system
- **Notifications**: In-app notification system

---

## Core Entities

### Primary Entities
1. **users** - Core user accounts (391+ users as of last count)
2. **user_profiles** - Extended user profile information
3. **studios** - Recording studio listings (180+ studios)
4. **reviews** - Studio reviews with moderation
5. **messages** - Direct messaging between users
6. **notifications** - In-app notification system

### Supporting Entities
7. **accounts** - OAuth provider accounts (NextAuth)
8. **sessions** - User session management (NextAuth)
9. **studio_images** - Studio photo galleries
10. **studio_services** - Many-to-many: Studios ↔ Services
11. **studio_studio_types** - Many-to-many: Studios ↔ Types
12. **subscriptions** - Premium subscriptions
13. **pending_subscriptions** - Subscription workflow
14. **user_connections** - Professional networking
15. **saved_searches** - Saved search filters
16. **content_reports** - Content moderation
17. **review_responses** - Owner responses to reviews
18. **refunds** - Payment refund tracking
19. **user_metadata** - Key-value user metadata
20. **contacts** - Legacy contact system (limited use)
21. **poi** - Points of interest (future use)
22. **faq** - Frequently asked questions

---

## Relationship Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         USERS (Core)                         │
│  • Authentication & Authorization                            │
│  • Roles: USER, STUDIO_OWNER, ADMIN                         │
└──────────────────────────────────────────────────────────────┘
         │
         ├─── 1:1 ───────► user_profiles (Extended profile data)
         │
         ├─── 1:N ───────► studios (Owner → Studios)
         │                    │
         │                    ├─── 1:N ──► studio_images
         │                    ├─── 1:N ──► studio_services
         │                    ├─── 1:N ──► studio_studio_types
         │                    ├─── 1:N ──► reviews (Studio reviews)
         │                    └─── 1:N ──► pending_subscriptions
         │
         ├─── 1:N ───────► reviews (Reviewer → Reviews)
         │                    │
         │                    └─── 1:1 ──► review_responses
         │
         ├─── 1:N ───────► messages (as sender)
         ├─── 1:N ───────► messages (as receiver)
         │
         ├─── 1:N ───────► notifications
         │
         ├─── 1:N ───────► user_connections (bidirectional)
         │
         ├─── 1:N ───────► subscriptions
         │
         ├─── 1:N ───────► saved_searches
         │
         ├─── 1:N ───────► user_metadata (key-value storage)
         │
         ├─── 1:N ───────► content_reports (as reporter)
         ├─── 1:N ───────► content_reports (as reported user)
         ├─── 1:N ───────► content_reports (as reviewer - admins)
         │
         ├─── 1:N ───────► refunds (processed by admin)
         │
         ├─── 1:N ───────► accounts (OAuth providers)
         │
         └─── 1:N ───────► sessions (active sessions)
```

---

## Detailed Table Specifications

### 1. **users**
**Purpose:** Core user account and authentication  
**Records:** 391+ users  
**Primary Usage:** Authentication, authorization, user identification

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique user identifier (base64url encoded) |
| email | String | UNIQUE, NOT NULL | User email address |
| username | String | UNIQUE, NOT NULL | Unique username (URL-friendly) |
| display_name | String | NOT NULL | Display name shown to other users |
| avatar_url | String | NULLABLE | Profile picture URL (Cloudinary) |
| role | Role enum | DEFAULT: USER | User role (USER, STUDIO_OWNER, ADMIN) |
| email_verified | Boolean | DEFAULT: false | Email verification status |
| password | String | NULLABLE | Hashed password (bcrypt, nullable for OAuth) |
| created_at | DateTime | DEFAULT: now() | Account creation timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships
- 1:1 with **user_profiles** (extended profile)
- 1:N with **studios** (owned studios)
- 1:N with **reviews** (as reviewer and as owner)
- 1:N with **messages** (as sender and receiver)
- 1:N with **notifications**, **sessions**, **accounts**
- 1:N with **subscriptions**, **user_connections**
- 1:N with **content_reports** (reporter, reported, reviewer)

#### Usage on Site
- **Homepage:** Powers "391+ Studios" stat display
- **Authentication:** NextAuth credentials and OAuth login
- **Search Results:** Display names and avatars in studio listings
- **Profile Pages:** Public profile display at `/{username}`
- **Admin Panel:** User management and role assignment
- **Middleware:** Role-based access control in `src/proxy.ts`

#### Indexes
- UNIQUE on `email`
- UNIQUE on `username`

---

### 2. **user_profiles**
**Purpose:** Extended user profile information and professional details  
**Primary Usage:** Profile pages, featured listings, professional networking

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique profile identifier |
| user_id | String | UNIQUE, FOREIGN KEY | References users.id (CASCADE DELETE) |
| last_name | String | NULLABLE | User's last name |
| phone | String | NULLABLE | Contact phone number |
| about | String | NULLABLE | Full "About Me" biography |
| short_about | String | NULLABLE | Short bio (used in listings) |
| location | String | NULLABLE | User's location/city |
| rate_tier_1 | String | NULLABLE | Rate tier 1 pricing |
| rate_tier_2 | String | NULLABLE | Rate tier 2 pricing |
| rate_tier_3 | String | NULLABLE | Rate tier 3 pricing |
| show_rates | Boolean | DEFAULT: false | Display rates publicly |
| facebook_url | String | NULLABLE | Facebook profile link |
| twitter_url | String | NULLABLE | Legacy Twitter (kept for compatibility) |
| x_url | String | NULLABLE | X (Twitter) profile link |
| linkedin_url | String | NULLABLE | LinkedIn profile link |
| instagram_url | String | NULLABLE | Instagram profile link |
| tiktok_url | String | NULLABLE | TikTok profile link |
| threads_url | String | NULLABLE | Threads profile link |
| youtube_url | String | NULLABLE | YouTube channel link |
| vimeo_url | String | NULLABLE | Vimeo profile (kept in DB, hidden in UI) |
| soundcloud_url | String | NULLABLE | SoundCloud profile link |
| is_crb_checked | Boolean | DEFAULT: false | Background check status |
| is_featured | Boolean | DEFAULT: false | Featured user status (homepage) |
| is_spotlight | Boolean | DEFAULT: false | Spotlight user status |
| verification_level | String | DEFAULT: "none" | Verification badge level |
| home_studio_description | String | NULLABLE | Home studio description |
| equipment_list | String | NULLABLE | Equipment list |
| services_offered | String | NULLABLE | Services description |
| show_email | Boolean | DEFAULT: false | Show email publicly |
| show_phone | Boolean | DEFAULT: false | Show phone publicly |
| show_address | Boolean | DEFAULT: false | Show address publicly |
| show_directions | Boolean | DEFAULT: true | Show directions on map |
| use_coordinates_for_map | Boolean | DEFAULT: false | Force coordinates over address |
| studio_name | String | NULLABLE | Studio name |
| connection1-12 | String | NULLABLE | Connection methods (VarChar 10) |
| custom_connection_methods | String[] | ARRAY | Custom connection methods |
| created_at | DateTime | DEFAULT: now() | Profile creation |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- 1:1 with **users** (CASCADE DELETE)

#### Usage on Site
- **Homepage:** Featured studios query (`is_featured: true`, limit 6)
  - VoiceoverGuy always pinned first, others randomized
- **Premium Page:** Featured and spotlight users display
- **Search Results:** `short_about` shown in studio cards
- **Profile Pages:** Full profile display with social links
- **Edit Profile:** All fields editable at `/dashboard/profile/edit`
- **Map Display:** Controls coordinate vs address display logic

#### Indexes
- Indexed on `is_featured` (homepage queries)
- Indexed on `is_spotlight` (premium page queries)
- Indexed on `verification_level`
- Indexed on `user_id`

#### Special Notes
- **Featured System:** Max 6 featured studios on homepage
- **Social Media:** New fields (TikTok, Threads, X) added recently
- **Connection Methods:** 12 predefined + custom array
- **Visibility Controls:** Granular privacy settings per field

---

### 3. **studios**
**Purpose:** Recording studio listings and profiles  
**Records:** 180+ studios  
**Primary Usage:** Studio directory, search, map display

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique studio identifier |
| owner_id | String | FOREIGN KEY | References users.id |
| name | String | NOT NULL | Studio name |
| description | String | NULLABLE | Full studio description |
| address | String | NULLABLE | Legacy address field (kept for compatibility) |
| full_address | String | NULLABLE | Full address for geocoding |
| abbreviated_address | String | NULLABLE | Abbreviated address for display |
| city | String | NOT NULL | City (extracted from full_address) |
| latitude | Decimal(10,8) | NULLABLE | Geocoded latitude |
| longitude | Decimal(11,8) | NULLABLE | Geocoded longitude |
| website_url | String | NULLABLE | Studio website |
| phone | String | NULLABLE | Contact phone |
| is_premium | Boolean | DEFAULT: false | Premium subscription status |
| is_verified | Boolean | DEFAULT: false | Verified studio badge |
| is_profile_visible | Boolean | DEFAULT: true | Public visibility toggle |
| status | StudioStatus | DEFAULT: ACTIVE | Studio status (DRAFT, ACTIVE, INACTIVE, PENDING) |
| created_at | DateTime | DEFAULT: now() | Created timestamp |
| updated_at | DateTime | NOT NULL | Last update timestamp |

#### Relationships
- N:1 with **users** (owner)
- 1:N with **studio_images** (photo gallery)
- 1:N with **studio_services** (available services)
- 1:N with **studio_studio_types** (studio types)
- 1:N with **reviews** (studio reviews)
- 1:N with **pending_subscriptions**

#### Usage on Site
- **Homepage:** Featured studios (6 max, VoiceoverGuy pinned)
  - Query: `status: ACTIVE`, `users.user_profiles.is_featured: true`
- **Search Results:** Advanced search with filters
  - Location-based (radius search using lat/lng)
  - Type filtering (home, recording, voiceover, etc.)
  - Service filtering (ISDN, Source-Connect, etc.)
  - Sort by: name, created_at, rating, premium (always first)
- **Map View:** All studios with coordinates displayed
- **Profile Pages:** Public view at `/{username}`
- **Admin Panel:** Studio management at `/admin/studios`
- **Studio Management:** Owner dashboard at `/studio/manage`

#### Address System
The studio address system has evolved:
1. **Legacy:** Single `address` field (kept for backward compatibility)
2. **Current:** Three-field system:
   - `full_address`: Used for geocoding
   - `abbreviated_address`: Shown to users
   - `city`: Extracted and stored for filtering

#### Search & Discovery
- **Prioritization Logic** (in search results):
  1. Premium studios (`is_premium: true`)
  2. Verified studios (`is_verified: true`)
  3. Studios with images
  4. VoiceoverGuy pinned at top when featured
  5. Then by sort parameter (name, date, etc.)
  
- **Geographic Search:**
  - Haversine formula for radius calculations
  - Supports radius: 10, 25, 50, 100, 250, 500 miles
  - Falls back to city-based filtering if no coordinates

#### Indexes
- Indexed on `owner_id`
- Indexed on `status`
- Indexed on `is_premium`
- Indexed on `is_verified`
- Indexed on `city`

---

### 4. **studio_images**
**Purpose:** Studio photo galleries  
**Primary Usage:** Studio profile photos, search result thumbnails

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique image identifier |
| studio_id | String | FOREIGN KEY | References studios.id (CASCADE DELETE) |
| image_url | String | NOT NULL | Cloudinary image URL |
| alt_text | String | NULLABLE | Image description (accessibility) |
| sort_order | Int | DEFAULT: 0 | Display order |

#### Relationships
- N:1 with **studios** (CASCADE DELETE)

#### Usage on Site
- **Search Results:** First image shown as thumbnail
  - Query: `orderBy: { sort_order: 'asc' }, take: 1`
- **Profile Pages:** Full gallery display
- **Admin Panel:** Image management
- **Upload:** Via Cloudinary API (see `src/lib/cloudinary.ts`)

#### Special Notes
- Images stored on Cloudinary CDN
- Optimized delivery with Cloudinary transformations
- Search results prioritize studios with images

---

### 5. **studio_services**
**Purpose:** Many-to-many relationship: Studios ↔ Available Services  
**Primary Usage:** Studio capabilities, search filtering

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique record identifier |
| studio_id | String | FOREIGN KEY | References studios.id (CASCADE DELETE) |
| service | ServiceType | NOT NULL | Service type enum |

#### Unique Constraint
- `[studio_id, service]` - Prevents duplicate services per studio

#### Relationships
- N:1 with **studios** (CASCADE DELETE)

#### Available Services (ServiceType enum)
- ISDN
- SOURCE_CONNECT
- SOURCE_CONNECT_NOW
- CLEANFEED
- SESSION_LINK_PRO
- ZOOM
- SKYPE
- TEAMS

#### Usage on Site
- **Search Filters:** "Services" dropdown
  - Query: `studio_services: { some: { service: { in: [...] } } }`
- **Profile Display:** Services listed as badges
- **Studio Editor:** Multi-select service picker

---

### 6. **studio_studio_types**
**Purpose:** Many-to-many relationship: Studios ↔ Studio Types  
**Primary Usage:** Studio categorization, search filtering

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique record identifier |
| studio_id | String | FOREIGN KEY | References studios.id (CASCADE DELETE) |
| studio_type | StudioType | NOT NULL | Studio type enum |

#### Unique Constraint
- `[studio_id, studio_type]` - Prevents duplicate types per studio

#### Relationships
- N:1 with **studios** (CASCADE DELETE)

#### Available Types (StudioType enum)
- HOME - Home studio
- RECORDING - Professional recording studio
- VO_COACH - Voiceover coaching
- EDITING - Audio editing services
- PODCAST - Podcast production
- VOICEOVER - Voiceover services

#### Usage on Site
- **Search Filters:** "Studio Type" dropdown
  - Query: `studio_studio_types: { some: { studio_type: { in: [...] } } }`
- **Profile Display:** Types shown as badges
- **Admin Panel:** Type management
- **Migration:** Migrated from old string-based system (see `scripts/migrate-studio-types.ts`)

#### Special Notes
- Multiple types per studio supported
- Recent migration from string to enum (safer typing)
- CSV import script available for bulk operations

---

### 7. **reviews**
**Purpose:** User reviews for studios with moderation  
**Primary Usage:** Studio ratings, social proof, reputation management

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique review identifier |
| studio_id | String | FOREIGN KEY | References studios.id (CASCADE DELETE) |
| reviewer_id | String | FOREIGN KEY | References users.id (reviewer) |
| owner_id | String | FOREIGN KEY | References users.id (studio owner) |
| rating | SmallInt | NOT NULL | Rating 1-5 stars |
| content | String | NULLABLE | Review text (min 10, max 2000 chars) |
| is_anonymous | Boolean | DEFAULT: false | Anonymous review flag |
| status | ReviewStatus | DEFAULT: PENDING | Moderation status |
| created_at | DateTime | DEFAULT: now() | Review creation |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- N:1 with **studios** (CASCADE DELETE)
- N:1 with **users** as reviewer
- N:1 with **users** as owner
- 1:1 with **review_responses** (optional owner response)

#### Review Statuses (ReviewStatus enum)
- PENDING - Awaiting moderation
- APPROVED - Published on site
- REJECTED - Not approved

#### Usage on Site
- **Profile Pages:** Review list with rating distribution
  - Shows average rating, total count
  - Bar chart showing 5-star to 1-star distribution
- **Search Results:** Review count displayed (`_count: { reviews: true }`)
- **Review Submission:** 
  - Auth required
  - Cannot review own studio
  - Cannot review same studio twice
  - Minimum 10 characters, max 2000
  - Status: PENDING (moderation required)
- **Admin Moderation:** Review approval/rejection at `/admin/reports`

#### Validation Rules
```typescript
// From src/app/api/reviews/route.ts
- rating: 1-5 (required)
- content: 10-2000 characters (required)
- isAnonymous: boolean
- Cannot review own studio
- Cannot review same studio twice
```

#### Anonymous Reviews
- If `is_anonymous: true`, reviewer name hidden
- Still tracked in database for moderation

---

### 8. **review_responses**
**Purpose:** Studio owner responses to reviews (one per review)  
**Primary Usage:** Owner engagement, customer service

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique response identifier |
| review_id | String | UNIQUE, FOREIGN KEY | References reviews.id (CASCADE DELETE) |
| author_id | String | FOREIGN KEY | References users.id (CASCADE DELETE) |
| content | String | NOT NULL | Response text |
| created_at | DateTime | DEFAULT: now() | Response creation |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- 1:1 with **reviews** (CASCADE DELETE, UNIQUE)
- N:1 with **users** (response author - CASCADE DELETE)

#### Usage on Site
- **Profile Pages:** Shown below parent review
- **Response Creation:** POST `/api/reviews/[id]/response`
- **Permissions:** Only studio owner can respond
- **Limit:** One response per review (enforced by UNIQUE constraint)

---

### 9. **messages**
**Purpose:** Direct messaging between users  
**Primary Usage:** User-to-user communication, contact studio feature

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique message identifier |
| sender_id | String | FOREIGN KEY | References users.id (sender) |
| receiver_id | String | FOREIGN KEY | References users.id (receiver) |
| subject | String | NULLABLE | Message subject (5-200 chars) |
| content | String | NOT NULL | Message body (10-2000 chars) |
| is_read | Boolean | DEFAULT: false | Read status |
| created_at | DateTime | DEFAULT: now() | Message sent timestamp |

#### Relationships
- N:1 with **users** as sender
- N:1 with **users** as receiver

#### Usage on Site
- **Contact Studio Form:** Send inquiry to studio owner
  - Located in studio profile sidebar
  - Pre-fills receiver as studio owner
  - Optional studio_id tracking
- **Messages Inbox:** GET `/api/messages?type=received`
  - Auto-marks as read when fetched
  - Paginated (20 per page default)
- **Sent Messages:** GET `/api/messages?type=sent`
- **Dashboard:** Unread message count displayed

#### Validation Rules
```typescript
// From src/app/api/messages/route.ts
- subject: 5-200 characters
- content: 10-2000 characters
- Cannot message yourself
- Receiver must exist
```

#### Future Enhancements
- Email notifications (TODO in code)
- Real-time messaging (WebSocket)
- Message threads/conversations
- Attachment support

---

### 10. **notifications**
**Purpose:** In-app notification system  
**Primary Usage:** User alerts, activity updates

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique notification identifier |
| user_id | String | FOREIGN KEY | References users.id (CASCADE DELETE) |
| type | NotificationType | NOT NULL | Notification type enum |
| title | String | NOT NULL | Notification title |
| message | String | NOT NULL | Notification message body |
| data | Json | NULLABLE | Additional structured data |
| read | Boolean | DEFAULT: false | Read status |
| read_at | DateTime | NULLABLE | When marked as read |
| action_url | String | NULLABLE | Link to related content |
| created_at | DateTime | DEFAULT: now() | Creation timestamp |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- N:1 with **users** (CASCADE DELETE)

#### Notification Types (NotificationType enum)
- MESSAGE_RECEIVED - New direct message
- REVIEW_RECEIVED - New review on your studio
- REVIEW_RESPONSE - Owner responded to your review
- CONNECTION_REQUEST - New connection request
- CONNECTION_ACCEPTED - Connection accepted
- STUDIO_VERIFIED - Studio verified by admin
- PAYMENT_SUCCESS - Payment processed successfully
- PAYMENT_FAILED - Payment failed
- SUBSCRIPTION_EXPIRING - Subscription expiring soon

#### Usage on Site
- **Notification Bell:** Header component shows unread count
  - Component: `src/components/notifications/NotificationBell.tsx`
  - Badge shows unread count
  - Dropdown shows recent 5 notifications
- **Notifications API:** GET `/api/user/notifications`
  - Supports pagination (limit/offset)
  - Filter by unread only
  - Ordered by created_at DESC
- **Mark as Read:** Automatic or manual

#### Data Structure
The `data` JSON field stores context-specific information:
```json
{
  "studio_id": "abc123",
  "review_id": "xyz789",
  "sender_name": "John Doe",
  // ... type-specific fields
}
```

#### Future Enhancements
- Email notifications (service exists in `src/lib/notifications.ts`)
- Real-time notifications (WebSocket/SSE)
- Notification preferences per type
- Bulk mark as read

---

### 11. **subscriptions**
**Purpose:** Active premium subscriptions tracking  
**Primary Usage:** Premium feature access, billing management

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique subscription identifier |
| user_id | String | FOREIGN KEY | References users.id |
| stripe_subscription_id | String | UNIQUE, NULLABLE | Stripe subscription ID |
| stripe_customer_id | String | NULLABLE | Stripe customer ID |
| paypal_subscription_id | String | UNIQUE, NULLABLE | PayPal subscription ID (legacy) |
| payment_method | PaymentMethod | DEFAULT: STRIPE | Payment provider |
| status | SubscriptionStatus | NOT NULL | Current subscription status |
| current_period_start | DateTime | NULLABLE | Billing period start |
| current_period_end | DateTime | NULLABLE | Billing period end |
| cancelled_at | DateTime | NULLABLE | Cancellation timestamp |
| created_at | DateTime | DEFAULT: now() | Subscription creation |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- N:1 with **users**

#### Subscription Statuses (SubscriptionStatus enum)
- ACTIVE - Active subscription
- CANCELLED - User cancelled (may still be active until period end)
- PAST_DUE - Payment failed, grace period
- UNPAID - Payment not received
- INCOMPLETE - Initial payment incomplete
- SUSPENDED - Admin suspended

#### Payment Methods (PaymentMethod enum)
- STRIPE - Stripe (primary)
- PAYPAL - PayPal (legacy, minimal usage)

#### Usage on Site
- **Premium Features:** Controls access to:
  - Featured studio listings
  - Priority search placement
  - Verified badge
  - Enhanced profile features
- **Billing Portal:** Stripe Customer Portal integration
  - Manage payment methods
  - View invoices
  - Cancel subscription
- **Stripe Webhook:** `/api/stripe/webhook`
  - Handles subscription lifecycle events
  - Updates status automatically
  - See `src/app/api/stripe/webhook/route.ts`

#### Premium Plans
```typescript
// From src/lib/stripe.ts
PREMIUM_YEARLY: {
  name: "Premium Studio Listing",
  price: 29900, // $299.00/year
  currency: "usd",
  interval: "year"
}
```

#### Subscription Flow
1. User clicks "Go Premium" on studio profile
2. POST `/api/stripe/checkout` creates Stripe session
3. User completes payment on Stripe Checkout
4. Webhook receives `checkout.session.completed`
5. Subscription record created with ACTIVE status
6. Studio marked `is_premium: true`

---

### 12. **pending_subscriptions**
**Purpose:** Subscription approval workflow (admin approval before activation)  
**Primary Usage:** Payment verification, fraud prevention

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique pending subscription ID |
| user_id | String | FOREIGN KEY | References users.id (CASCADE DELETE) |
| studio_id | String | FOREIGN KEY | References studios.id (CASCADE DELETE) |
| paypal_subscription_id | String | UNIQUE, NULLABLE | PayPal subscription ID |
| stripe_session_id | String | UNIQUE, NULLABLE | Stripe session ID |
| status | String | DEFAULT: "PENDING_APPROVAL" | Approval status |
| payment_method | PaymentMethod | NOT NULL | Payment provider |
| created_at | DateTime | DEFAULT: now() | Request creation |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- N:1 with **users** (CASCADE DELETE)
- N:1 with **studios** (CASCADE DELETE)

#### Status Values
- `"PENDING_APPROVAL"` - Awaiting admin review
- `"APPROVED"` - Admin approved, subscription activated
- `"REJECTED"` - Admin rejected
- `"CANCELLED"` - User cancelled

#### Usage on Site
- **Admin Panel:** Review pending subscriptions
- **Approval Flow:**
  1. User completes payment
  2. Record created with `PENDING_APPROVAL`
  3. Admin reviews in admin panel
  4. Admin approves → creates `subscriptions` record
  5. Studio marked premium
- **Why Pending:** Fraud prevention, payment verification

#### Current Status
- Mostly used for PayPal subscriptions
- Stripe subscriptions often auto-approved via webhook
- Consider streamlining workflow in future

---

### 13. **user_connections**
**Purpose:** Professional networking (LinkedIn-style connections)  
**Primary Usage:** User-to-user networking, connection requests

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique connection identifier |
| user_id | String | FOREIGN KEY | References users.id (requestor) |
| connected_user_id | String | FOREIGN KEY | References users.id (recipient) |
| accepted | Boolean | DEFAULT: false | Connection accepted status |
| created_at | DateTime | DEFAULT: now() | Request creation |

#### Unique Constraint
- `[user_id, connected_user_id]` - Prevents duplicate requests

#### Relationships
- N:1 with **users** as requestor
- N:1 with **users** as recipient

#### Usage on Site
- **Profile Pages:** "Connect" button
  - Component: `src/components/networking/ConnectionButton.tsx`
  - Shows status: Connect, Pending, Connected
- **Connection Flow:**
  1. User A sends request to User B
  2. Record created: `{ user_id: A, connected_user_id: B, accepted: false }`
  3. User B receives notification
  4. User B accepts: `accepted: true`
  5. Both users now "connected"
- **Network Page:** `/network`
  - View connections
  - Pending requests
  - Suggested connections
- **Connection Stats:** Dashboard shows connection count

#### API Endpoints
- POST `/api/user/connections` - Send/accept/reject request
- GET `/api/network` - Get connections list
- Network stats: `/api/network?stats=true`

#### Bidirectional Queries
To check if two users are connected, query in both directions:
```typescript
where: {
  OR: [
    { user_id: userA, connected_user_id: userB },
    { user_id: userB, connected_user_id: userA }
  ],
  accepted: true
}
```

---

### 14. **saved_searches**
**Purpose:** Save search filters for quick access  
**Primary Usage:** User convenience, saved search alerts (future)

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique saved search identifier |
| user_id | String | FOREIGN KEY | References users.id (CASCADE DELETE) |
| name | String | NOT NULL | User-defined name |
| filters | String | NOT NULL | JSON string of search parameters |
| created_at | DateTime | DEFAULT: now() | Created timestamp |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- N:1 with **users** (CASCADE DELETE)

#### Filters Format
Stored as JSON string:
```json
{
  "location": "Los Angeles, CA",
  "radius": 50,
  "studioTypes": ["HOME", "RECORDING"],
  "services": ["SOURCE_CONNECT", "ISDN"],
  "sortBy": "name"
}
```

#### Usage on Site
- **Search Page:** "Save Search" button
- **Dashboard:** "Saved Searches" widget
  - Quick links to run saved searches
  - Edit/delete saved searches
- **Future:** Email alerts when new studios match saved search

#### Current Implementation
- API endpoints exist but UI is minimal
- Potential for expansion with email notifications
- Could add "New studios matching your search" alerts

---

### 15. **content_reports**
**Purpose:** Content moderation and reporting system  
**Primary Usage:** User-generated content moderation, abuse prevention

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique report identifier |
| reporter_id | String | FOREIGN KEY | References users.id (reporter) |
| content_type | ContentType | NOT NULL | Type of content being reported |
| content_id | String | NOT NULL | ID of reported content |
| reported_user_id | String | NULLABLE, FOREIGN KEY | References users.id (content owner) |
| reason | ReportReason | NOT NULL | Report reason enum |
| custom_reason | String | NULLABLE | Additional details |
| status | ReportStatus | DEFAULT: PENDING | Moderation status |
| reviewed_by_id | String | NULLABLE, FOREIGN KEY | References users.id (admin) |
| reviewed_at | DateTime | NULLABLE | Review completion timestamp |
| resolution | String | NULLABLE | Admin resolution notes |
| created_at | DateTime | DEFAULT: now() | Report creation |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- N:1 with **users** as reporter
- N:1 with **users** as reported_user (nullable)
- N:1 with **users** as reviewer (admin, nullable)

#### Content Types (ContentType enum)
- REVIEW - Studio review
- MESSAGE - Direct message
- STUDIO - Studio listing
- USER - User profile

#### Report Reasons (ReportReason enum)
- SPAM - Spam content
- HARASSMENT - Harassment or bullying
- HATE_SPEECH - Hate speech
- INAPPROPRIATE - Inappropriate content
- FAKE_INFO - False information
- COPYRIGHT - Copyright violation
- OTHER - Other (requires custom_reason)

#### Report Statuses (ReportStatus enum)
- PENDING - Awaiting review
- REVIEWED - Admin reviewed (no action)
- RESOLVED - Issue resolved (action taken)
- DISMISSED - Report dismissed

#### Usage on Site
- **Report Button:** Available on reviews, studios, profiles
- **Admin Panel:** `/admin/reports`
  - View all reports
  - Filter by type, status, reason
  - Review and take action
- **Moderation Actions:**
  - Approve/reject content
  - Warn/suspend users
  - Delete content
  - Dismiss report

#### Report Flow
1. User clicks "Report" on content
2. Selects reason, adds details
3. POST `/api/moderation/reports`
4. Admin notified
5. Admin reviews at `/admin/reports`
6. Admin takes action, updates status
7. Reporter notified of outcome

---

### 16. **accounts**
**Purpose:** OAuth provider accounts (NextAuth.js)  
**Primary Usage:** Social login (Google, Facebook, Twitter)

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique account identifier |
| user_id | String | FOREIGN KEY | References users.id (CASCADE DELETE) |
| type | String | NOT NULL | Account type ("oauth", "email", etc.) |
| provider | String | NOT NULL | OAuth provider name |
| provider_account_id | String | NOT NULL | Provider's user ID |
| refresh_token | String | NULLABLE | OAuth refresh token |
| access_token | String | NULLABLE | OAuth access token |
| expires_at | Int | NULLABLE | Token expiration (Unix timestamp) |
| token_type | String | NULLABLE | Token type ("Bearer", etc.) |
| scope | String | NULLABLE | OAuth scopes granted |
| id_token | String | NULLABLE | OpenID Connect ID token |
| session_state | String | NULLABLE | OAuth session state |

#### Unique Constraint
- `[provider, provider_account_id]` - Prevents duplicate provider accounts

#### Relationships
- N:1 with **users** (CASCADE DELETE)

#### Supported Providers
From `src/lib/auth.ts`:
- **Google OAuth** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- **Facebook OAuth** (`FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`)
- **Twitter OAuth** (`TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`)

#### Usage on Site
- **Sign In Page:** `/auth/signin`
  - "Sign in with Google" button
  - "Sign in with Facebook" button
  - "Sign in with Twitter" button
- **Sign Up:** Automatic user creation on first OAuth login
- **Account Linking:** Users can link multiple providers

#### NextAuth Integration
- Managed by NextAuth.js `PrismaAdapter`
- See `src/lib/auth.ts` for configuration
- Supports multiple accounts per user

---

### 17. **sessions**
**Purpose:** User session management (NextAuth.js)  
**Primary Usage:** Authentication state persistence

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique session identifier |
| session_token | String | UNIQUE, NOT NULL | Session token (JWT or database token) |
| user_id | String | FOREIGN KEY | References users.id (CASCADE DELETE) |
| expires | DateTime | NOT NULL | Session expiration timestamp |

#### Relationships
- N:1 with **users** (CASCADE DELETE)

#### Usage on Site
- **Authentication:** NextAuth session validation
- **Session Strategy:** JWT-based (configured in `src/lib/auth.ts`)
  - `session: { strategy: 'jwt' }`
- **Session Duration:** Configurable via NextAuth
- **Middleware:** Session validation in `src/proxy.ts`

#### Session Management
- Created on login
- Updated on activity
- Expired sessions cleaned up automatically
- Multiple sessions per user supported (multi-device)

---

### 18. **user_metadata**
**Purpose:** Flexible key-value storage for user-specific data  
**Primary Usage:** Feature flags, preferences, temporary data

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique metadata identifier |
| user_id | String | FOREIGN KEY | References users.id (CASCADE DELETE) |
| key | String | NOT NULL | Metadata key |
| value | String | NULLABLE | Metadata value (JSON string) |
| created_at | DateTime | DEFAULT: now() | Created timestamp |
| updated_at | DateTime | NOT NULL | Last update |

#### Unique Constraint
- `[user_id, key]` - One value per key per user

#### Relationships
- N:1 with **users** (CASCADE DELETE)

#### Indexes
- Indexed on `key` (fast key lookups)
- Indexed on `user_id` (fast user lookups)

#### Usage on Site
- **Flexible Storage:** Store arbitrary user data without schema changes
- **Use Cases:**
  - Feature flags: `{ key: "feature_beta_access", value: "true" }`
  - Preferences: `{ key: "theme", value: "dark" }`
  - Onboarding: `{ key: "onboarding_completed", value: "2025-01-01" }`
  - Tracking: `{ key: "last_search", value: "{...}" }`
- **Benefits:**
  - No migrations needed for new metadata types
  - Easy to add/remove features
  - Per-user customization

#### Example Queries
```typescript
// Get user metadata
await db.user_metadata.findUnique({
  where: { user_id_key: { user_id, key: "theme" } }
});

// Set user metadata
await db.user_metadata.upsert({
  where: { user_id_key: { user_id, key: "theme" } },
  create: { id, user_id, key: "theme", value: "dark", ... },
  update: { value: "dark", updated_at: new Date() }
});
```

---

### 19. **refunds**
**Purpose:** Payment refund tracking and audit trail  
**Primary Usage:** Admin refund processing, financial records

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique refund identifier |
| stripe_refund_id | String | UNIQUE, NOT NULL | Stripe refund ID |
| stripe_payment_intent_id | String | NOT NULL | Original payment intent |
| amount | Int | NOT NULL | Refund amount in cents |
| currency | String | NOT NULL | Currency code (USD, EUR, etc.) |
| reason | String | NULLABLE | Refund reason |
| status | RefundStatus | NOT NULL | Refund status enum |
| processed_by | String | FOREIGN KEY | References users.id (admin) |
| created_at | DateTime | DEFAULT: now() | Refund creation |
| updated_at | DateTime | NOT NULL | Last update |

#### Relationships
- N:1 with **users** (admin who processed refund)

#### Refund Statuses (RefundStatus enum)
- PENDING - Refund initiated
- SUCCEEDED - Refund completed
- FAILED - Refund failed
- CANCELLED - Refund cancelled

#### Usage on Site
- **Admin Panel:** Process refunds for subscriptions
- **Audit Trail:** Track all refund activity
- **Stripe Integration:** Refunds processed via Stripe API
- **Webhook:** Refund status updates via Stripe webhook

#### Refund Flow
1. Admin initiates refund in admin panel
2. POST `/api/admin/refunds` calls Stripe API
3. Refund record created with PENDING status
4. Stripe processes refund
5. Webhook updates status to SUCCEEDED/FAILED
6. Customer notified via email

---

### 20. **contacts** (Legacy)
**Purpose:** Legacy contact/connection system  
**Current Status:** Minimal usage, superseded by `user_connections`

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique contact identifier |
| user1 | String | NOT NULL | First user ID |
| user2 | String | NOT NULL | Second user ID |
| accepted | Int | DEFAULT: 0 | Acceptance status (0 or 1) |
| created_at | DateTime | DEFAULT: now() | Created timestamp |
| updated_at | DateTime | NOT NULL | Last update |

#### Notes
- Legacy table from earlier version
- **Recommendation:** Migrate remaining records to `user_connections`
- `user_connections` has better structure (Boolean, Foreign Keys)
- No current usage in active codebase

---

### 21. **poi** (Points of Interest)
**Purpose:** Location-based points of interest  
**Current Status:** Minimal usage, prepared for future features

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique POI identifier |
| name | String | NOT NULL | POI name |
| description | String | NULLABLE | POI description |
| latitude | Decimal(10,8) | NULLABLE | Latitude coordinate |
| longitude | Decimal(11,8) | NULLABLE | Longitude coordinate |
| address | String | NULLABLE | Street address |
| category | String | NULLABLE | POI category |
| created_at | DateTime | DEFAULT: now() | Created timestamp |
| updated_at | DateTime | NOT NULL | Last update |

#### Future Use Cases
- Nearby studios map markers
- Recommended locations
- Co-working spaces
- Audio equipment stores
- Recording equipment rental
- Conference venues

#### Current Status
- Table exists but not actively used
- No API endpoints currently implemented
- Prepared for future map features

---

### 22. **faq**
**Purpose:** Frequently Asked Questions  
**Primary Usage:** Help center, support documentation

#### Schema
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PRIMARY KEY | Unique FAQ identifier |
| question | String | NOT NULL | FAQ question |
| answer | String | NOT NULL | FAQ answer |
| sort_order | Int | NULLABLE | Display order |
| created_at | DateTime | DEFAULT: now() | Created timestamp |
| updated_at | DateTime | NOT NULL | Last update |

#### Usage on Site
- **FAQ Page:** `/faq` or `/help`
- **Admin Panel:** FAQ management
- **Ordering:** Displayed by `sort_order` ASC

#### Current Status
- Basic implementation
- Admin can add/edit/reorder FAQs
- Public-facing FAQ page

---

## Enumerations

### ContentType
**Usage:** `content_reports.content_type`

| Value | Description |
|-------|-------------|
| REVIEW | Studio review |
| MESSAGE | Direct message |
| STUDIO | Studio listing |
| USER | User profile |

---

### NotificationType
**Usage:** `notifications.type`

| Value | Description |
|-------|-------------|
| MESSAGE_RECEIVED | New direct message received |
| REVIEW_RECEIVED | New review on your studio |
| REVIEW_RESPONSE | Owner responded to your review |
| CONNECTION_REQUEST | New connection request |
| CONNECTION_ACCEPTED | Connection request accepted |
| STUDIO_VERIFIED | Studio verified by admin |
| PAYMENT_SUCCESS | Payment processed successfully |
| PAYMENT_FAILED | Payment processing failed |
| SUBSCRIPTION_EXPIRING | Subscription expiring soon |

---

### PaymentMethod
**Usage:** `subscriptions.payment_method`, `pending_subscriptions.payment_method`

| Value | Description |
|-------|-------------|
| STRIPE | Stripe payment (primary) |
| PAYPAL | PayPal payment (legacy, minimal use) |

---

### RefundStatus
**Usage:** `refunds.status`

| Value | Description |
|-------|-------------|
| PENDING | Refund initiated, processing |
| SUCCEEDED | Refund completed successfully |
| FAILED | Refund failed |
| CANCELLED | Refund cancelled |

---

### ReportReason
**Usage:** `content_reports.reason`

| Value | Description |
|-------|-------------|
| SPAM | Spam or unwanted content |
| HARASSMENT | Harassment or bullying |
| HATE_SPEECH | Hate speech or discrimination |
| INAPPROPRIATE | Inappropriate content |
| FAKE_INFO | False or misleading information |
| COPYRIGHT | Copyright violation |
| OTHER | Other (requires custom_reason) |

---

### ReportStatus
**Usage:** `content_reports.status`

| Value | Description |
|-------|-------------|
| PENDING | Awaiting admin review |
| REVIEWED | Admin reviewed, no action taken |
| RESOLVED | Issue resolved, action taken |
| DISMISSED | Report dismissed as invalid |

---

### ReviewStatus
**Usage:** `reviews.status`

| Value | Description |
|-------|-------------|
| PENDING | Awaiting moderation |
| APPROVED | Published on site |
| REJECTED | Not approved for publication |

---

### Role
**Usage:** `users.role`

| Value | Description | Permissions |
|-------|-------------|-------------|
| USER | Regular user | Basic access, can review, message |
| STUDIO_OWNER | Studio owner | All USER permissions + studio management |
| ADMIN | Administrator | Full access, moderation, user management |

#### Role-Based Access Control (RBAC)
Enforced in `src/proxy.ts` middleware:
- `/admin/*` → ADMIN only
- `/studio/manage/*` → STUDIO_OWNER or ADMIN
- `/api/admin/*` → ADMIN only
- `/api/studio/manage/*` → STUDIO_OWNER or ADMIN

---

### ServiceType
**Usage:** `studio_services.service`

| Value | Description |
|-------|-------------|
| ISDN | ISDN connection |
| SOURCE_CONNECT | Source-Connect Standard |
| SOURCE_CONNECT_NOW | Source-Connect Now (browser) |
| CLEANFEED | Cleanfeed audio |
| SESSION_LINK_PRO | SessionLinkPRO |
| ZOOM | Zoom audio |
| SKYPE | Skype |
| TEAMS | Microsoft Teams |

---

### StudioStatus
**Usage:** `studios.status`

| Value | Description |
|-------|-------------|
| DRAFT | Unpublished draft |
| ACTIVE | Published and searchable |
| INACTIVE | Temporarily inactive |
| PENDING | Awaiting approval |

---

### StudioType
**Usage:** `studio_studio_types.studio_type`

| Value | Description |
|-------|-------------|
| HOME | Home studio |
| RECORDING | Professional recording studio |
| VO_COACH | Voiceover coaching |
| EDITING | Audio editing services |
| PODCAST | Podcast production |
| VOICEOVER | Voiceover services |

---

### SubscriptionStatus
**Usage:** `subscriptions.status`

| Value | Description |
|-------|-------------|
| ACTIVE | Active subscription, features enabled |
| CANCELLED | Cancelled, may still be active until period end |
| PAST_DUE | Payment failed, in grace period |
| UNPAID | Payment not received |
| INCOMPLETE | Initial payment not completed |
| SUSPENDED | Admin suspended |

---

## Usage Patterns

### Authentication & Authorization

#### Session Management
```typescript
// Get server session
const session = await getServerSession(authOptions);

// Check authentication
if (!session?.user?.id) {
  return redirect('/auth/signin');
}

// Check role
if (session.user.role !== 'ADMIN') {
  return redirect('/unauthorized');
}
```

#### Middleware Protection
All routes protected via `src/proxy.ts`:
- Public: `/`, `/search`, `/{username}`, `/api/studios/search`
- Auth Required: `/dashboard`, `/messages`, `/network`
- Studio Owner: `/studio/manage/*`
- Admin: `/admin/*`, `/api/admin/*`

---

### Studio Search & Discovery

#### Homepage Featured Studios
```typescript
// Max 6 featured studios, VoiceoverGuy pinned first
const featuredStudios = await db.studios.findMany({
  where: {
    status: 'ACTIVE',
    users: {
      user_profiles: {
        is_featured: true
      }
    }
  },
  include: {
    users: {
      select: {
        display_name: true,
        username: true,
        avatar_url: true,
        user_profiles: { select: { short_about: true } }
      }
    },
    studio_services: true,
    studio_studio_types: true,
    studio_images: { take: 1, orderBy: { sort_order: 'asc' } },
    _count: { select: { reviews: true } }
  },
  take: 6
});

// Prioritize VoiceoverGuy, randomize others
const voiceoverGuy = featuredStudios.find(s => s.users?.username === 'VoiceoverGuy');
const others = featuredStudios.filter(s => s.users?.username !== 'VoiceoverGuy')
  .sort(() => Math.random() - 0.5)
  .slice(0, 5);
const result = voiceoverGuy ? [voiceoverGuy, ...others] : others;
```

#### Advanced Search
```typescript
// Multi-filter search with geographic radius
const where: Prisma.studiosWhereInput = {
  status: 'ACTIVE',
  is_profile_visible: true,
  
  // Text search
  OR: [
    { name: { contains: query, mode: 'insensitive' } },
    { description: { contains: query, mode: 'insensitive' } }
  ],
  
  // Studio types
  studio_studio_types: {
    some: { studio_type: { in: studioTypes } }
  },
  
  // Services
  studio_services: {
    some: { service: { in: services } }
  },
  
  // City filter
  city: { contains: city, mode: 'insensitive' }
};

const studios = await db.studios.findMany({
  where,
  include: { /* ... */ },
  orderBy: [
    { is_premium: 'desc' }, // Premium first
    { is_verified: 'desc' },
    { name: 'asc' }
  ]
});

// Post-process: Geographic filtering
if (lat && lng && radius) {
  studios = studios.filter(studio => {
    const distance = haversineDistance(lat, lng, studio.latitude, studio.longitude);
    return distance <= radius;
  });
}
```

---

### Review System

#### Submit Review
```typescript
// Validation
- Must be authenticated
- Cannot review own studio
- Cannot review same studio twice
- Rating: 1-5 stars
- Content: 10-2000 characters
- Status: PENDING (requires moderation)

// Create review
const review = await db.reviews.create({
  data: {
    id: randomBytes(12).toString('base64url'),
    studio_id,
    reviewer_id: session.user.id,
    owner_id: studio.owner_id,
    rating,
    content,
    is_anonymous,
    status: 'PENDING',
    updated_at: new Date()
  }
});
```

#### Display Reviews
```typescript
// Get reviews with responses
const reviews = await db.reviews.findMany({
  where: {
    studio_id,
    status: 'APPROVED' // Only show approved
  },
  include: {
    users_reviews_reviewer_idTousers: {
      select: { display_name: true, avatar_url: true }
    },
    review_responses: {
      include: {
        users: {
          select: { display_name: true, avatar_url: true }
        }
      }
    }
  },
  orderBy: { created_at: 'desc' }
});

// Calculate rating distribution
const distribution = [5, 4, 3, 2, 1].map(rating => ({
  rating,
  count: reviews.filter(r => r.rating === rating).length,
  percentage: (count / reviews.length) * 100
}));
```

---

### Messaging System

#### Send Message
```typescript
// Validation
- Sender must be authenticated
- Cannot message yourself
- Receiver must exist
- Subject: 5-200 chars
- Content: 10-2000 chars

// Create message
const message = await db.messages.create({
  data: {
    id: randomBytes(12).toString('base64url'),
    sender_id: session.user.id,
    receiver_id,
    subject,
    content,
  }
});

// TODO: Send email notification
```

#### Fetch Messages
```typescript
// Inbox (auto-mark as read)
const messages = await db.messages.findMany({
  where: { receiver_id: session.user.id },
  include: {
    users_messages_sender_idTousers: {
      select: { display_name: true, avatar_url: true }
    }
  },
  orderBy: { created_at: 'desc' }
});

// Mark as read
await db.messages.updateMany({
  where: {
    receiver_id: session.user.id,
    is_read: false
  },
  data: { is_read: true }
});
```

---

### Payment & Subscriptions

#### Stripe Checkout Flow
```typescript
// 1. Create checkout session
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: 'subscription',
  success_url: `${baseUrl}/{username}?payment=success`,
  cancel_url: `${baseUrl}/{username}?payment=cancelled`,
  metadata: { user_id, studio_id, plan: 'PREMIUM_YEARLY' }
});

// 2. User completes payment on Stripe

// 3. Webhook receives event
app.post('/api/stripe/webhook', async (req) => {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    webhookSecret
  );
  
  if (event.type === 'checkout.session.completed') {
    // Create subscription record
    await db.subscriptions.create({
      data: {
        id: randomBytes(12).toString('base64url'),
        user_id: session.metadata.user_id,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        payment_method: 'STRIPE',
        status: 'ACTIVE',
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    // Mark studio as premium
    await db.studios.update({
      where: { id: studio_id },
      data: { is_premium: true }
    });
  }
});
```

---

### Networking

#### Connection Request Flow
```typescript
// 1. Send request
await db.user_connections.create({
  data: {
    id: randomBytes(12).toString('base64url'),
    user_id: currentUserId,
    connected_user_id: targetUserId,
    accepted: false,
    created_at: new Date()
  }
});

// 2. Check connection status
const connection = await db.user_connections.findFirst({
  where: {
    OR: [
      { user_id: userA, connected_user_id: userB },
      { user_id: userB, connected_user_id: userA }
    ]
  }
});

// Status: null (not connected), { accepted: false } (pending), { accepted: true } (connected)

// 3. Accept request (recipient only)
await db.user_connections.update({
  where: { id: connection.id },
  data: { accepted: true }
});
```

---

### Notifications

#### Create Notification
```typescript
await db.notifications.create({
  data: {
    id: randomBytes(12).toString('base64url'),
    user_id,
    type: 'REVIEW_RECEIVED',
    title: 'New Review',
    message: `${reviewer.display_name} left a review on ${studio.name}`,
    data: { studio_id, review_id },
    action_url: `/${studio.owner.username}#reviews`,
    read: false,
    created_at: new Date(),
    updated_at: new Date()
  }
});
```

#### Fetch Notifications
```typescript
// Get unread count for bell badge
const unreadCount = await db.notifications.count({
  where: {
    user_id: session.user.id,
    read: false
  }
});

// Get recent notifications
const notifications = await db.notifications.findMany({
  where: { user_id: session.user.id },
  orderBy: { created_at: 'desc' },
  take: 20
});
```

---

## Indexes and Performance

### Existing Indexes

#### users
- PRIMARY KEY on `id`
- UNIQUE on `email`
- UNIQUE on `username`

#### user_profiles
- PRIMARY KEY on `id`
- UNIQUE on `user_id`
- INDEX on `is_featured` (homepage queries)
- INDEX on `is_spotlight` (premium page)
- INDEX on `verification_level`
- INDEX on `user_id`

#### studios
- PRIMARY KEY on `id`
- INDEX on `owner_id` (foreign key)
- INDEX on `status` (search filtering)
- INDEX on `is_premium` (search prioritization)
- INDEX on `is_verified`
- INDEX on `city` (location searches)

#### studio_services
- PRIMARY KEY on `id`
- UNIQUE on `[studio_id, service]`
- INDEX on `studio_id` (foreign key)

#### studio_studio_types
- PRIMARY KEY on `id`
- UNIQUE on `[studio_id, studio_type]`
- INDEX on `studio_id` (foreign key)

#### studio_images
- PRIMARY KEY on `id`
- INDEX on `studio_id` (foreign key)

#### reviews
- PRIMARY KEY on `id`
- INDEX on `studio_id` (foreign key)
- INDEX on `reviewer_id` (foreign key)
- INDEX on `owner_id` (foreign key)
- INDEX on `status` (moderation queries)

#### messages
- PRIMARY KEY on `id`
- INDEX on `sender_id` (foreign key)
- INDEX on `receiver_id` (foreign key)

#### notifications
- PRIMARY KEY on `id`
- INDEX on `user_id` (foreign key, CASCADE DELETE)

#### user_connections
- PRIMARY KEY on `id`
- UNIQUE on `[user_id, connected_user_id]`
- INDEX on `user_id` (foreign key)
- INDEX on `connected_user_id` (foreign key)

#### sessions
- PRIMARY KEY on `id`
- UNIQUE on `session_token`
- INDEX on `user_id` (foreign key, CASCADE DELETE)

#### accounts
- PRIMARY KEY on `id`
- UNIQUE on `[provider, provider_account_id]`
- INDEX on `user_id` (foreign key, CASCADE DELETE)

#### user_metadata
- PRIMARY KEY on `id`
- UNIQUE on `[user_id, key]`
- INDEX on `key` (fast key lookups)
- INDEX on `user_id` (fast user lookups, CASCADE DELETE)

### Performance Considerations

#### Homepage Query Optimization
```typescript
// GOOD: Limited to 6, includes only needed fields
const featuredStudios = await db.studios.findMany({
  where: { 
    status: 'ACTIVE',
    users: { user_profiles: { is_featured: true } }
  },
  include: {
    users: { select: { /* minimal fields */ } },
    studio_images: { take: 1 }
  },
  take: 6
});
```

#### Search Query Optimization
```typescript
// GOOD: Prioritization happens in memory after fetching
// Premium studios naturally bubble to top via sorting
orderBy: [
  { is_premium: 'desc' },
  { is_verified: 'desc' },
  { name: 'asc' }
]
```

#### Potential Improvements
1. **Add INDEX on `reviews.rating`** - For faster average rating calculations
2. **Add INDEX on `messages.is_read`** - For unread count queries
3. **Add INDEX on `notifications.read`** - For unread notifications
4. **Add INDEX on `studios.created_at`** - For "newest studios" sort
5. **Composite INDEX on `studios (status, is_premium, is_verified)`** - For search queries
6. **Add materialized view for studio average ratings** - Expensive calculation

#### Cache Strategy
From `src/app/api/studios/search/route.ts`:
- Page 1 results NOT cached (randomized each load)
- Pages 2+ cached with MD5 hash of params
- Cache key: `md5(JSON.stringify(searchParams))`
- Implementation: Custom cache service (in-memory or Redis)

---

## Migration History

### Recent Migrations
1. **Studio Types Enum** (2025-01)
   - Migrated from string-based to enum
   - Script: `scripts/migrate-studio-types.ts`
   
2. **Address System** (2025-01)
   - Added `full_address`, `abbreviated_address`, `city`
   - Script: `scripts/migrate-address-to-full-address.ts`
   
3. **Social Media Fields** (2025-01)
   - Added `x_url`, `tiktok_url`, `threads_url`
   - Deprecated `twitter_url` (kept for compatibility)
   
4. **Avatar Migration** (2025-01)
   - Migrated avatars to Cloudinary
   - Script: `scripts/migrate-avatars.ts`

5. **Profile Visibility** (2024-12)
   - Added `is_profile_visible` to studios
   - Script: `scripts/add-is-profile-visible.ts`

### Backup Strategy
- Database backups stored in `/backups/`
- Format: `database_backup_YYYY-MM-DDTHH-mm-ss-sssZ.json`
- Studio images backed up separately
- Restoration scripts available in `/scripts/`

---

## Data Integrity

### Foreign Key Constraints
All foreign keys properly defined with CASCADE or RESTRICT:
- **CASCADE DELETE:** When parent deleted, children deleted
  - `user_profiles.user_id` → users (delete profile with user)
  - `notifications.user_id` → users
  - `sessions.user_id` → users
  - `accounts.user_id` → users
  - `studio_images.studio_id` → studios
  - `studio_services.studio_id` → studios
  - `studio_studio_types.studio_id` → studios
  - `reviews.studio_id` → studios
  - `review_responses.review_id` → reviews
  
- **NO CASCADE (default RESTRICT):**
  - `studios.owner_id` → users (prevent user deletion if owns studios)
  - `subscriptions.user_id` → users

### Unique Constraints
- Prevent duplicate data
- Examples:
  - `users.email` - No duplicate emails
  - `users.username` - No duplicate usernames
  - `[studio_id, service]` - No duplicate services per studio
  - `[user_id, connected_user_id]` - No duplicate connection requests
  - `[user_id, key]` - No duplicate metadata keys

### Default Values
- `created_at: DEFAULT now()` - Automatic timestamps
- `updated_at` - Must be manually set (Prisma auto-updates)
- Boolean defaults for flags (`false` for most)
- Enum defaults (`Role: USER`, `ReviewStatus: PENDING`, etc.)

---

## Security Considerations

### Password Storage
- Passwords hashed with bcrypt (10 rounds)
- OAuth users have null password
- Never returned in API responses

### Session Security
- JWT tokens signed with `NEXTAUTH_SECRET`
- Session tokens in httpOnly cookies
- CSRF protection enabled

### API Authorization
- All mutations require authentication
- Role-based access control (RBAC)
- Middleware validates permissions
- API routes check session + role

### Data Privacy
- Email addresses not shown publicly unless `show_email: true`
- Phone numbers hidden unless `show_phone: true`
- Anonymous reviews hide reviewer identity
- Soft deletes considered for GDPR compliance (not yet implemented)

### Input Validation
- Zod schemas for all API inputs
- SQL injection prevented by Prisma parameterization
- XSS prevention via React escaping
- File upload validation (Cloudinary)

---

## Future Enhancements

### Proposed Features
1. **Real-time Messaging**
   - WebSocket integration
   - Message threads/conversations
   - Typing indicators
   - Read receipts

2. **Advanced Search**
   - Full-text search (Postgres FTS or Algolia)
   - Fuzzy matching
   - Search suggestions
   - Saved search alerts (email)

3. **Analytics**
   - Studio view tracking
   - Search analytics
   - User engagement metrics
   - Conversion tracking

4. **Social Features**
   - User posts/updates
   - Activity feed
   - Studio following
   - Endorsements/recommendations

5. **Booking System**
   - Studio availability calendar
   - Booking requests
   - Payment integration
   - Automated scheduling

6. **Portfolio System**
   - Audio samples/demos
   - Video showcases
   - Work history
   - Client testimonials

### Database Optimizations
1. **Materialized Views**
   - Studio average ratings
   - User connection counts
   - Search result rankings

2. **Read Replicas**
   - Separate read/write databases
   - Scale read-heavy operations

3. **Caching Layer**
   - Redis for session storage
   - Cache search results
   - Cache user profiles

4. **Archive Strategy**
   - Move old messages to archive
   - Soft delete inactive users
   - Clean up old notifications

---

## Contact & Maintenance

### Database Connection
- **Provider:** PostgreSQL
- **ORM:** Prisma (v5.x)
- **Connection:** `DATABASE_URL` environment variable
- **Pooling:** PgBouncer recommended for production

### Schema Updates
```bash
# Create migration
npx prisma migrate dev --name description_of_change

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Reset database (dev only)
npx prisma migrate reset
```

### Monitoring
- Query performance: Check slow query logs
- Connection pool: Monitor active connections
- Storage: Track database size growth
- Errors: Sentry integration for error tracking

---

**Report Generated:** 2025-11-27  
**Last Schema Update:** 2025-01-12  
**Database Version:** PostgreSQL 14+  
**ORM Version:** Prisma 5.x  
**Total Tables:** 19 core + 3 legacy/future  
**Total Enums:** 8

