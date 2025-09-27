# Prisma Schema Analysis Report

## Overview
Analysis of both Prisma schemas to identify differences and conflicts for the admin site merge.

## Schema Comparison

### Database Provider
- **vostudiofinder**: PostgreSQL
- **vosf-old-site**: PostgreSQL
- **Status**: ✅ Compatible

### Generator Configuration
- **vostudiofinder**: `prisma-client-js`
- **vosf-old-site**: `prisma-client-js`
- **Status**: ✅ Compatible

## Model Analysis

### 1. User Model
**vostudiofinder**:
- Uses camelCase field names with `@map()` for snake_case database columns
- Has comprehensive UserProfile relationship
- Includes UserMetadata for extensibility
- Role enum: USER, STUDIO_OWNER, ADMIN

**vosf-old-site**:
- Uses snake_case field names directly (no `@map()`)
- Has UserProfile but missing some fields
- Missing UserMetadata model
- Role enum: USER, STUDIO_OWNER, ADMIN

**Conflicts**:
- Field naming convention differences
- Missing UserMetadata in vosf-old-site
- UserProfile field differences

### 2. Studio Model
**vostudiofinder**:
- Uses camelCase with `@map()`
- Comprehensive relationships

**vosf-old-site**:
- Uses snake_case directly
- Same structure but different naming

**Conflicts**:
- Field naming convention differences

### 3. Unique Models in vosf-old-site
- **Faq**: FAQ management (missing in vostudiofinder)
- **Contact**: Contact management (missing in vostudiofinder)
- **Poi**: Points of Interest (missing in vostudiofinder)

### 4. Model Naming Differences
**vostudiofinder** uses PascalCase:
- `Account`, `Session`, `Studio`, `Review`, etc.

**vosf-old-site** uses snake_case:
- `accounts`, `sessions`, `studios`, `reviews`, etc.

## Field Mapping Conflicts

### User Model Fields
| Field | vostudiofinder | vosf-old-site | Conflict |
|-------|----------------|---------------|----------|
| id | `id` | `id` | ✅ Same |
| email | `email` | `email` | ✅ Same |
| username | `username` | `username` | ✅ Same |
| displayName | `displayName @map("display_name")` | `display_name` | ⚠️ Naming |
| avatarUrl | `avatarUrl @map("avatar_url")` | `avatar_url` | ⚠️ Naming |
| role | `role` | `role` | ✅ Same |
| emailVerified | `emailVerified @map("email_verified")` | `email_verified` | ⚠️ Naming |
| password | `password` | `password` | ✅ Same |
| createdAt | `createdAt @map("created_at")` | `created_at` | ⚠️ Naming |
| updatedAt | `updatedAt @map("updated_at")` | `updated_at` | ⚠️ Naming |

### UserProfile Model Fields
**vostudiofinder** has additional fields:
- `shortAbout` (missing in vosf-old-site)
- `showRates` (missing in vosf-old-site)
- `showEmail`, `showPhone`, `showAddress` (missing in vosf-old-site)

## Relationship Differences

### User Model Relationships
**vostudiofinder**:
- Uses descriptive relation names
- Includes UserMetadata relationship
- More comprehensive relationship structure

**vosf-old-site**:
- Uses auto-generated relation names
- Missing UserMetadata relationship
- Simpler relationship structure

## Enum Differences

### Role Enum
- Both have: USER, STUDIO_OWNER, ADMIN
- **Status**: ✅ Compatible

### StudioType Enum
- Both have: RECORDING, PODCAST, HOME, PRODUCTION, MOBILE
- **Status**: ✅ Compatible

### ServiceType Enum
- Both have: ISDN, SOURCE_CONNECT, SOURCE_CONNECT_NOW, CLEANFEED, SESSION_LINK_PRO, ZOOM, SKYPE, TEAMS
- **Status**: ✅ Compatible

## Migration Strategy Recommendations

### 1. Unified Schema Approach
- Use **vostudiofinder** schema as the base (more comprehensive)
- Add missing models from **vosf-old-site**: Faq, Contact, Poi
- Standardize on camelCase with `@map()` for database columns

### 2. Field Additions
- Add missing UserProfile fields to support vosf-old-site functionality
- Ensure UserMetadata model is included for extensibility

### 3. Data Migration
- Map snake_case fields to camelCase with proper `@map()` directives
- Preserve all existing data relationships
- Handle UserProfile field differences gracefully

### 4. Admin-Specific Models
- **Faq**: Add to unified schema for FAQ management
- **Contact**: Add to unified schema for contact management  
- **Poi**: Add to unified schema for points of interest

## Risk Assessment

### High Risk
- Field naming convention differences
- Missing UserMetadata in vosf-old-site
- UserProfile field differences

### Medium Risk
- Relationship naming differences
- Missing admin-specific models

### Low Risk
- Enum compatibility
- Basic model structure compatibility

## Next Steps
1. Create unified schema based on vostudiofinder
2. Add missing models from vosf-old-site
3. Develop migration scripts for data transfer
4. Test schema migration in development environment
