# Database Schema - Minimal Report
## VO Studio Finder

**Database:** PostgreSQL | **ORM:** Prisma 5.x  
**Tables:** 22 | **Enums:** 8 | **Records:** 391+ users, 180+ studios

---

## Quick Stats
- **User Accounts:** 391+
- **Studio Listings:** 180+
- **Authentication:** NextAuth (JWT + OAuth)
- **Payments:** Stripe ($299/year premium)
- **Storage:** Cloudinary (images)

---

## Tables Overview

### Core (6 tables)
1. **users** - User accounts and authentication
2. **user_profiles** - Extended profile information
3. **studios** - Studio listings with location data
4. **reviews** - Studio reviews with moderation
5. **messages** - Direct user messaging
6. **notifications** - In-app notifications

### Studio Related (3 tables)
7. **studio_images** - Photo galleries
8. **studio_services** - Available services (ISDN, Source-Connect, etc.)
9. **studio_studio_types** - Studio categories (Home, Recording, etc.)

### Authentication (3 tables)
10. **accounts** - OAuth providers (Google, Facebook, Twitter)
11. **sessions** - User sessions
12. **user_metadata** - Key-value user data

### Social (3 tables)
13. **user_connections** - Professional networking
14. **saved_searches** - Saved search filters
15. **review_responses** - Owner responses to reviews

### Payments (3 tables)
16. **subscriptions** - Active subscriptions
17. **pending_subscriptions** - Subscription workflow
18. **refunds** - Refund tracking

### Moderation (1 table)
19. **content_reports** - Content reporting system

### Supporting (3 tables)
20. **faq** - FAQs
21. **contacts** - Legacy (use user_connections)
22. **poi** - Future: Points of interest

---

## Key Relationships

```
users (391+)
  ├─ user_profiles (1:1)
  ├─ studios (1:N) - 180+ studios
  │   ├─ studio_images (1:N)
  │   ├─ studio_services (1:N)
  │   ├─ studio_studio_types (1:N)
  │   └─ reviews (1:N)
  │       └─ review_responses (1:1)
  ├─ messages (1:N as sender/receiver)
  ├─ notifications (1:N)
  ├─ user_connections (1:N bidirectional)
  ├─ subscriptions (1:N)
  ├─ accounts (1:N OAuth)
  └─ sessions (1:N)
```

---

## Enums (8)

1. **Role** - USER, STUDIO_OWNER, ADMIN
2. **StudioStatus** - DRAFT, ACTIVE, INACTIVE, PENDING
3. **StudioType** - HOME, RECORDING, VO_COACH, EDITING, PODCAST, VOICEOVER
4. **ServiceType** - ISDN, SOURCE_CONNECT, CLEANFEED, ZOOM, SKYPE, TEAMS, etc.
5. **ReviewStatus** - PENDING, APPROVED, REJECTED
6. **SubscriptionStatus** - ACTIVE, CANCELLED, PAST_DUE, UNPAID, etc.
7. **NotificationType** - MESSAGE_RECEIVED, REVIEW_RECEIVED, CONNECTION_REQUEST, etc.
8. **ContentType** - REVIEW, MESSAGE, STUDIO, USER

Plus: ReportReason, ReportStatus, PaymentMethod, RefundStatus

---

## Primary Features

### Search & Discovery
- Location-based radius search (Haversine formula)
- Filter by type, services, city
- Premium studios prioritized
- Featured listings (max 6 on homepage)

### Authentication
- Email/password (bcrypt)
- OAuth (Google, Facebook, Twitter)
- JWT sessions
- Role-based access control

### Payments
- Stripe integration
- $299/year premium subscription
- Webhook handling
- Refund processing

### Moderation
- Review moderation (PENDING → APPROVED/REJECTED)
- Content reporting system
- Admin review panel

---

## Key Fields

### Address System (studios)
- `full_address` - For geocoding
- `abbreviated_address` - Display to users
- `city` - Filtering
- `latitude/longitude` - Map display & radius search

### Featured System (user_profiles)
- `is_featured` - Homepage featured (max 6)
- `is_spotlight` - Premium page spotlight
- **Special:** VoiceoverGuy always pinned first

### Visibility (studios & user_profiles)
- `is_profile_visible` - Public/private toggle
- `show_email`, `show_phone`, `show_address` - Granular privacy

---

## Tech Stack

- **Database:** PostgreSQL 14+
- **ORM:** Prisma 5.x
- **Auth:** NextAuth.js (JWT strategy)
- **Payments:** Stripe API
- **Storage:** Cloudinary CDN
- **Validation:** Zod schemas
- **Monitoring:** Sentry

---

## Maintenance

```bash
# Migrations
npx prisma migrate dev --name description
npx prisma migrate deploy

# Generate client
npx prisma generate

# Reset (dev only)
npx prisma migrate reset
```

---

**Report Type:** Minimal  
**Last Update:** 2025-11-27  
**Schema Version:** 2025-01-12

---

## Quick Reference

| Entity | Count | Key Field |
|--------|-------|-----------|
| Users | 391+ | username |
| Studios | 180+ | name |
| Tables | 22 | - |
| Enums | 8 | - |
| Relations | 50+ | - |

**Featured Studios:** Max 6 (VoiceoverGuy always first)  
**Premium Price:** $299/year  
**Review Moderation:** Required (PENDING → APPROVED)  
**Search Radius:** 10-500 miles  
**Session Strategy:** JWT

