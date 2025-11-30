# Database Schema - Standard Report
## VO Studio Finder Database Architecture

**Generated:** November 27, 2025  
**Database:** PostgreSQL (via Prisma ORM)  
**Total Tables:** 22 tables | **Enums:** 8

---

## Overview

The VO Studio Finder database supports a professional networking and directory platform for voiceover artists and recording studios with:

- **391+ Users** - User accounts with role-based access control
- **180+ Studios** - Recording studio listings with search and filtering
- **Reviews & Ratings** - Moderated review system with owner responses
- **Messaging** - Direct user-to-user communication
- **Payments** - Stripe subscription management for premium features
- **Networking** - Professional connections between users
- **Moderation** - Content reporting and admin review system

---

## Core Tables

### User Management

#### 1. **users**
Core user accounts with authentication and authorization.
- **Fields:** id, email, username, display_name, avatar_url, role, email_verified, password, timestamps
- **Roles:** USER, STUDIO_OWNER, ADMIN
- **Usage:** Authentication, profiles, search results

#### 2. **user_profiles**
Extended user profile information and professional details.
- **Fields:** 30+ fields including bio, social links, rates, visibility settings, featured status
- **Usage:** Profile pages, featured listings, professional details
- **Special:** Max 6 featured studios on homepage (VoiceoverGuy always first)

#### 3. **accounts**
OAuth provider accounts for social login (NextAuth).
- **Providers:** Google, Facebook, Twitter
- **Fields:** provider, provider_account_id, tokens, scopes

#### 4. **sessions**
User session management (NextAuth).
- **Strategy:** JWT-based authentication
- **Fields:** session_token, user_id, expires

#### 5. **user_metadata**
Flexible key-value storage for user-specific data.
- **Usage:** Feature flags, preferences, tracking
- **Format:** JSON string values

---

### Studio Management

#### 6. **studios**
Recording studio listings and profiles (180+ studios).
- **Fields:** name, description, address (3-field system), coordinates, website, phone, status
- **Flags:** is_premium, is_verified, is_profile_visible
- **Address System:** full_address (geocoding), abbreviated_address (display), city (filtering)
- **Search:** Location-based radius search, type filtering, service filtering

#### 7. **studio_images**
Studio photo galleries stored on Cloudinary.
- **Fields:** studio_id, image_url, alt_text, sort_order
- **Usage:** Profile galleries, search result thumbnails

#### 8. **studio_services**
Many-to-many: Studios ↔ Available Services.
- **Services:** ISDN, Source-Connect, Cleanfeed, Zoom, Skype, Teams, etc.
- **Usage:** Search filters, profile badges

#### 9. **studio_studio_types**
Many-to-many: Studios ↔ Studio Types.
- **Types:** Home, Recording, VO Coach, Editing, Podcast, Voiceover
- **Usage:** Categorization, search filters

---

### Reviews & Ratings

#### 10. **reviews**
User reviews for studios with moderation.
- **Fields:** studio_id, reviewer_id, owner_id, rating (1-5), content, is_anonymous, status
- **Status:** PENDING (moderation) → APPROVED/REJECTED
- **Rules:** Cannot review own studio, cannot review twice, min 10 chars

#### 11. **review_responses**
Studio owner responses to reviews (one per review).
- **Fields:** review_id (UNIQUE), author_id, content
- **Limit:** One response per review

---

### Messaging & Notifications

#### 12. **messages**
Direct messaging between users.
- **Fields:** sender_id, receiver_id, subject, content, is_read
- **Validation:** 5-200 char subject, 10-2000 char content
- **Usage:** Contact studio form, user inbox

#### 13. **notifications**
In-app notification system.
- **Types:** Message received, review received, connection request, payment success, etc.
- **Fields:** user_id, type, title, message, data (JSON), read status, action_url
- **Display:** Notification bell with unread badge

---

### Networking

#### 14. **user_connections**
Professional networking (LinkedIn-style).
- **Fields:** user_id, connected_user_id, accepted (Boolean)
- **Flow:** Request → Pending → Accepted
- **Queries:** Bidirectional (check both directions)

#### 15. **saved_searches**
Save search filters for quick access.
- **Format:** JSON string of search parameters
- **Future:** Email alerts for matching studios

---

### Payments & Subscriptions

#### 16. **subscriptions**
Active premium subscriptions (Stripe).
- **Fields:** user_id, stripe_subscription_id, stripe_customer_id, status, billing periods
- **Status:** ACTIVE, CANCELLED, PAST_DUE, UNPAID, etc.
- **Price:** $299/year for premium studio listing

#### 17. **pending_subscriptions**
Subscription approval workflow.
- **Status:** PENDING_APPROVAL → APPROVED/REJECTED
- **Usage:** Payment verification, fraud prevention

#### 18. **refunds**
Payment refund tracking and audit trail.
- **Fields:** stripe_refund_id, amount, currency, reason, status, processed_by
- **Status:** PENDING → SUCCEEDED/FAILED

---

### Moderation

#### 19. **content_reports**
Content moderation and reporting system.
- **Content Types:** Review, Message, Studio, User
- **Reasons:** Spam, harassment, hate speech, inappropriate, fake info, copyright
- **Flow:** User reports → Admin reviews → Action taken

---

### Supporting Tables

#### 20. **faq**
Frequently asked questions.
- **Fields:** question, answer, sort_order

#### 21. **contacts** (Legacy)
Legacy contact system, superseded by user_connections.
- **Status:** Minimal usage, recommend migration

#### 22. **poi** (Future)
Points of interest for future map features.
- **Status:** Not actively used, prepared for future

---

## Enumerations

### Role
- **USER** - Regular user (basic access)
- **STUDIO_OWNER** - Studio management permissions
- **ADMIN** - Full access, moderation, user management

### StudioStatus
- **DRAFT** - Unpublished
- **ACTIVE** - Published and searchable
- **INACTIVE** - Temporarily inactive
- **PENDING** - Awaiting approval

### StudioType
- **HOME** - Home studio
- **RECORDING** - Professional recording studio
- **VO_COACH** - Voiceover coaching
- **EDITING** - Audio editing
- **PODCAST** - Podcast production
- **VOICEOVER** - Voiceover services

### ServiceType
- **ISDN**, **SOURCE_CONNECT**, **SOURCE_CONNECT_NOW**, **CLEANFEED**
- **SESSION_LINK_PRO**, **ZOOM**, **SKYPE**, **TEAMS**

### ReviewStatus
- **PENDING** - Awaiting moderation
- **APPROVED** - Published
- **REJECTED** - Not approved

### SubscriptionStatus
- **ACTIVE**, **CANCELLED**, **PAST_DUE**, **UNPAID**, **INCOMPLETE**, **SUSPENDED**

### NotificationType
- **MESSAGE_RECEIVED**, **REVIEW_RECEIVED**, **REVIEW_RESPONSE**
- **CONNECTION_REQUEST**, **CONNECTION_ACCEPTED**
- **STUDIO_VERIFIED**, **PAYMENT_SUCCESS**, **PAYMENT_FAILED**, **SUBSCRIPTION_EXPIRING**

### ContentType
- **REVIEW**, **MESSAGE**, **STUDIO**, **USER**

### ReportReason
- **SPAM**, **HARASSMENT**, **HATE_SPEECH**, **INAPPROPRIATE**
- **FAKE_INFO**, **COPYRIGHT**, **OTHER**

### ReportStatus
- **PENDING**, **REVIEWED**, **RESOLVED**, **DISMISSED**

### PaymentMethod
- **STRIPE** (primary), **PAYPAL** (legacy)

### RefundStatus
- **PENDING**, **SUCCEEDED**, **FAILED**, **CANCELLED**

---

## Key Relationships

### Users → Multiple Relationships
- 1:1 with user_profiles
- 1:N with studios (as owner)
- 1:N with reviews (as reviewer and as owner)
- 1:N with messages (as sender and receiver)
- 1:N with notifications
- 1:N with user_connections (bidirectional)
- 1:N with subscriptions
- 1:N with accounts (OAuth)
- 1:N with sessions

### Studios → Multiple Relationships
- N:1 with users (owner)
- 1:N with studio_images
- 1:N with studio_services
- 1:N with studio_studio_types
- 1:N with reviews
- 1:N with pending_subscriptions

### Reviews → Relationships
- N:1 with studios
- N:1 with users (reviewer)
- N:1 with users (owner)
- 1:1 with review_responses

---

## Search & Discovery Features

### Homepage
- Featured studios (max 6)
- VoiceoverGuy always pinned first
- Others randomized on each load
- Shows: name, avatar, short bio, services, types, review count

### Advanced Search
- **Location:** Radius search using Haversine formula (10-500 miles)
- **Filters:** Studio types, services, text search
- **Sorting:** Premium first, verified second, then by name/date
- **Caching:** Page 1 not cached (randomized), pages 2+ cached

### Prioritization
1. Premium studios (`is_premium: true`)
2. Verified studios (`is_verified: true`)
3. Studios with images
4. VoiceoverGuy pinned when featured
5. Sort parameter (name, date, rating)

---

## Performance & Indexes

### Key Indexes
- **users:** email (UNIQUE), username (UNIQUE)
- **user_profiles:** is_featured, is_spotlight, verification_level
- **studios:** status, is_premium, is_verified, city, owner_id
- **reviews:** studio_id, reviewer_id, owner_id, status
- **messages:** sender_id, receiver_id
- **notifications:** user_id, read
- **user_connections:** [user_id, connected_user_id] (UNIQUE)

### Cache Strategy
- Page 1 search results: NOT cached (randomized)
- Pages 2+: Cached with MD5 hash of search params
- Featured studios: Fresh query each time

---

## Security

### Authentication
- JWT-based sessions (NextAuth)
- bcrypt password hashing (10 rounds)
- OAuth support (Google, Facebook, Twitter)

### Authorization
- Role-based access control (RBAC)
- Middleware protection on routes
- API route permission checks

### Privacy
- Email/phone hidden by default
- Anonymous reviews supported
- Granular visibility controls
- Input validation (Zod schemas)

---

## Data Integrity

### Foreign Key Constraints
- **CASCADE DELETE:** user_profiles, notifications, sessions, accounts, studio_images, studio_services, studio_studio_types, reviews (on studio deletion)
- **RESTRICT:** studios (prevent user deletion if owns studios), subscriptions

### Unique Constraints
- users.email, users.username
- [studio_id, service], [studio_id, studio_type]
- [user_id, connected_user_id]
- [user_id, key] (metadata)

---

## Recent Migrations

1. **Studio Types Enum** (2025-01) - Migrated from strings to enum
2. **Address System** (2025-01) - Three-field address system
3. **Social Media Fields** (2025-01) - Added X, TikTok, Threads
4. **Avatar Migration** (2025-01) - Moved to Cloudinary
5. **Profile Visibility** (2024-12) - Added visibility toggle

---

## Future Enhancements

### Proposed Features
- Real-time messaging (WebSocket)
- Full-text search (Postgres FTS or Algolia)
- Analytics dashboard
- Booking system
- Portfolio system (audio/video samples)
- Activity feed

### Database Optimizations
- Materialized views for ratings
- Read replicas for scaling
- Redis caching layer
- Message archiving strategy

---

## Maintenance

### Schema Updates
```bash
npx prisma migrate dev --name description
npx prisma migrate deploy
npx prisma generate
```

### Monitoring
- Query performance logs
- Connection pool monitoring
- Storage growth tracking
- Sentry error tracking

---

**Report Type:** Standard Report  
**Last Schema Update:** 2025-01-12  
**Database:** PostgreSQL 14+ | Prisma 5.x

