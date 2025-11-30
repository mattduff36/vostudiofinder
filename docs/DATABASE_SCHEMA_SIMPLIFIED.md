# Database Schema - Simplified Report
## VO Studio Finder - Tables & Fields Reference

**Database:** PostgreSQL | **ORM:** Prisma  
**Tables:** 22 | **Enums:** 8

---

## Users & Authentication

### users
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| email | String | UNIQUE, NOT NULL |
| username | String | UNIQUE, NOT NULL |
| display_name | String | NOT NULL |
| avatar_url | String | NULLABLE |
| role | Role | DEFAULT: USER |
| email_verified | Boolean | DEFAULT: false |
| password | String | NULLABLE |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** 1:1 user_profiles, 1:N studios, reviews, messages, notifications, sessions, accounts, subscriptions, user_connections

---

### user_profiles
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user_id | String | UNIQUE, FOREIGN KEY → users |
| last_name | String | NULLABLE |
| phone | String | NULLABLE |
| about | String | NULLABLE |
| short_about | String | NULLABLE |
| location | String | NULLABLE |
| rate_tier_1/2/3 | String | NULLABLE |
| show_rates | Boolean | DEFAULT: false |
| facebook_url | String | NULLABLE |
| twitter_url | String | NULLABLE (legacy) |
| x_url | String | NULLABLE |
| linkedin_url | String | NULLABLE |
| instagram_url | String | NULLABLE |
| tiktok_url | String | NULLABLE |
| threads_url | String | NULLABLE |
| youtube_url | String | NULLABLE |
| vimeo_url | String | NULLABLE |
| soundcloud_url | String | NULLABLE |
| is_crb_checked | Boolean | DEFAULT: false |
| is_featured | Boolean | DEFAULT: false |
| is_spotlight | Boolean | DEFAULT: false |
| verification_level | String | DEFAULT: "none" |
| home_studio_description | String | NULLABLE |
| equipment_list | String | NULLABLE |
| services_offered | String | NULLABLE |
| show_email | Boolean | DEFAULT: false |
| show_phone | Boolean | DEFAULT: false |
| show_address | Boolean | DEFAULT: false |
| show_directions | Boolean | DEFAULT: true |
| use_coordinates_for_map | Boolean | DEFAULT: false |
| studio_name | String | NULLABLE |
| connection1-12 | String | NULLABLE |
| custom_connection_methods | String[] | ARRAY |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** 1:1 users (CASCADE DELETE)

---

### accounts
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user_id | String | FOREIGN KEY → users (CASCADE) |
| type | String | NOT NULL |
| provider | String | NOT NULL |
| provider_account_id | String | NOT NULL |
| refresh_token | String | NULLABLE |
| access_token | String | NULLABLE |
| expires_at | Int | NULLABLE |
| token_type | String | NULLABLE |
| scope | String | NULLABLE |
| id_token | String | NULLABLE |
| session_state | String | NULLABLE |

**Unique:** [provider, provider_account_id]  
**Relations:** N:1 users

---

### sessions
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| session_token | String | UNIQUE, NOT NULL |
| user_id | String | FOREIGN KEY → users (CASCADE) |
| expires | DateTime | NOT NULL |

**Relations:** N:1 users

---

### user_metadata
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user_id | String | FOREIGN KEY → users (CASCADE) |
| key | String | NOT NULL |
| value | String | NULLABLE |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Unique:** [user_id, key]  
**Relations:** N:1 users

---

## Studios

### studios
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| owner_id | String | FOREIGN KEY → users |
| name | String | NOT NULL |
| description | String | NULLABLE |
| address | String | NULLABLE (legacy) |
| full_address | String | NULLABLE |
| abbreviated_address | String | NULLABLE |
| city | String | NOT NULL |
| latitude | Decimal(10,8) | NULLABLE |
| longitude | Decimal(11,8) | NULLABLE |
| website_url | String | NULLABLE |
| phone | String | NULLABLE |
| is_premium | Boolean | DEFAULT: false |
| is_verified | Boolean | DEFAULT: false |
| is_profile_visible | Boolean | DEFAULT: true |
| status | StudioStatus | DEFAULT: ACTIVE |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** N:1 users, 1:N studio_images, studio_services, studio_studio_types, reviews, pending_subscriptions

---

### studio_images
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| studio_id | String | FOREIGN KEY → studios (CASCADE) |
| image_url | String | NOT NULL |
| alt_text | String | NULLABLE |
| sort_order | Int | DEFAULT: 0 |

**Relations:** N:1 studios

---

### studio_services
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| studio_id | String | FOREIGN KEY → studios (CASCADE) |
| service | ServiceType | NOT NULL |

**Unique:** [studio_id, service]  
**Relations:** N:1 studios

---

### studio_studio_types
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| studio_id | String | FOREIGN KEY → studios (CASCADE) |
| studio_type | StudioType | NOT NULL |

**Unique:** [studio_id, studio_type]  
**Relations:** N:1 studios

---

## Reviews

### reviews
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| studio_id | String | FOREIGN KEY → studios (CASCADE) |
| reviewer_id | String | FOREIGN KEY → users |
| owner_id | String | FOREIGN KEY → users |
| rating | SmallInt | NOT NULL (1-5) |
| content | String | NULLABLE |
| is_anonymous | Boolean | DEFAULT: false |
| status | ReviewStatus | DEFAULT: PENDING |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** N:1 studios, N:1 users (reviewer), N:1 users (owner), 1:1 review_responses

---

### review_responses
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| review_id | String | UNIQUE, FOREIGN KEY → reviews (CASCADE) |
| author_id | String | FOREIGN KEY → users (CASCADE) |
| content | String | NOT NULL |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** 1:1 reviews, N:1 users

---

## Messaging

### messages
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| sender_id | String | FOREIGN KEY → users |
| receiver_id | String | FOREIGN KEY → users |
| subject | String | NULLABLE |
| content | String | NOT NULL |
| is_read | Boolean | DEFAULT: false |
| created_at | DateTime | DEFAULT: now() |

**Relations:** N:1 users (sender), N:1 users (receiver)

---

### notifications
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user_id | String | FOREIGN KEY → users (CASCADE) |
| type | NotificationType | NOT NULL |
| title | String | NOT NULL |
| message | String | NOT NULL |
| data | Json | NULLABLE |
| read | Boolean | DEFAULT: false |
| read_at | DateTime | NULLABLE |
| action_url | String | NULLABLE |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** N:1 users

---

## Networking

### user_connections
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user_id | String | FOREIGN KEY → users |
| connected_user_id | String | FOREIGN KEY → users |
| accepted | Boolean | DEFAULT: false |
| created_at | DateTime | DEFAULT: now() |

**Unique:** [user_id, connected_user_id]  
**Relations:** N:1 users (bidirectional)

---

### saved_searches
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user_id | String | FOREIGN KEY → users (CASCADE) |
| name | String | NOT NULL |
| filters | String | NOT NULL (JSON) |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** N:1 users

---

## Payments

### subscriptions
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user_id | String | FOREIGN KEY → users |
| stripe_subscription_id | String | UNIQUE, NULLABLE |
| stripe_customer_id | String | NULLABLE |
| paypal_subscription_id | String | UNIQUE, NULLABLE |
| payment_method | PaymentMethod | DEFAULT: STRIPE |
| status | SubscriptionStatus | NOT NULL |
| current_period_start | DateTime | NULLABLE |
| current_period_end | DateTime | NULLABLE |
| cancelled_at | DateTime | NULLABLE |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** N:1 users

---

### pending_subscriptions
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user_id | String | FOREIGN KEY → users (CASCADE) |
| studio_id | String | FOREIGN KEY → studios (CASCADE) |
| paypal_subscription_id | String | UNIQUE, NULLABLE |
| stripe_session_id | String | UNIQUE, NULLABLE |
| status | String | DEFAULT: "PENDING_APPROVAL" |
| payment_method | PaymentMethod | NOT NULL |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** N:1 users, N:1 studios

---

### refunds
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| stripe_refund_id | String | UNIQUE, NOT NULL |
| stripe_payment_intent_id | String | NOT NULL |
| amount | Int | NOT NULL |
| currency | String | NOT NULL |
| reason | String | NULLABLE |
| status | RefundStatus | NOT NULL |
| processed_by | String | FOREIGN KEY → users |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** N:1 users (admin)

---

## Moderation

### content_reports
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| reporter_id | String | FOREIGN KEY → users |
| content_type | ContentType | NOT NULL |
| content_id | String | NOT NULL |
| reported_user_id | String | NULLABLE, FOREIGN KEY → users |
| reason | ReportReason | NOT NULL |
| custom_reason | String | NULLABLE |
| status | ReportStatus | DEFAULT: PENDING |
| reviewed_by_id | String | NULLABLE, FOREIGN KEY → users |
| reviewed_at | DateTime | NULLABLE |
| resolution | String | NULLABLE |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Relations:** N:1 users (reporter, reported_user, reviewer)

---

## Supporting Tables

### faq
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| question | String | NOT NULL |
| answer | String | NOT NULL |
| sort_order | Int | NULLABLE |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

---

### contacts (Legacy)
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| user1 | String | NOT NULL |
| user2 | String | NOT NULL |
| accepted | Int | DEFAULT: 0 |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Status:** Legacy, superseded by user_connections

---

### poi (Future)
| Field | Type | Constraints |
|-------|------|-------------|
| id | String | PRIMARY KEY |
| name | String | NOT NULL |
| description | String | NULLABLE |
| latitude | Decimal(10,8) | NULLABLE |
| longitude | Decimal(11,8) | NULLABLE |
| address | String | NULLABLE |
| category | String | NULLABLE |
| created_at | DateTime | DEFAULT: now() |
| updated_at | DateTime | NOT NULL |

**Status:** Prepared for future features

---

## Enumerations

### Role
USER, STUDIO_OWNER, ADMIN

### StudioStatus
DRAFT, ACTIVE, INACTIVE, PENDING

### StudioType
HOME, RECORDING, VO_COACH, EDITING, PODCAST, VOICEOVER

### ServiceType
ISDN, SOURCE_CONNECT, SOURCE_CONNECT_NOW, CLEANFEED, SESSION_LINK_PRO, ZOOM, SKYPE, TEAMS

### ReviewStatus
PENDING, APPROVED, REJECTED

### SubscriptionStatus
ACTIVE, CANCELLED, PAST_DUE, UNPAID, INCOMPLETE, SUSPENDED

### NotificationType
MESSAGE_RECEIVED, REVIEW_RECEIVED, REVIEW_RESPONSE, CONNECTION_REQUEST, CONNECTION_ACCEPTED, STUDIO_VERIFIED, PAYMENT_SUCCESS, PAYMENT_FAILED, SUBSCRIPTION_EXPIRING

### ContentType
REVIEW, MESSAGE, STUDIO, USER

### ReportReason
SPAM, HARASSMENT, HATE_SPEECH, INAPPROPRIATE, FAKE_INFO, COPYRIGHT, OTHER

### ReportStatus
PENDING, REVIEWED, RESOLVED, DISMISSED

### PaymentMethod
STRIPE, PAYPAL

### RefundStatus
PENDING, SUCCEEDED, FAILED, CANCELLED

---

**Report Type:** Simplified (Tables & Fields)  
**Generated:** 2025-11-27

