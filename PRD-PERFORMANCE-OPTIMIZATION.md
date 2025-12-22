# PRD: Performance & Optimization Improvements

## Document Control
- **Status**: Draft
- **Created**: 2025-12-22
- **Priority**: Medium-High
- **Impact**: Site Performance, SEO, User Experience
- **Deployment Target**: Vercel Serverless

---

## Executive Summary

Following a comprehensive codebase audit with ChatGPT, this PRD outlines validated performance optimizations for the VoiceoverStudioFinder platform. All improvements are designed to enhance performance on Vercel's serverless infrastructure while maintaining 100% of current functionality.

**Key Goals:**
- Reduce page load times by 20-30%
- Improve database query efficiency
- Optimize image delivery and bandwidth usage
- Enhance caching strategy for Vercel serverless
- Reduce cold start times

---

## Background & Context

### Current Infrastructure
- **Platform**: Vercel Serverless (Node.js runtime)
- **Database**: Neon PostgreSQL (serverless, connection pooled)
- **Framework**: Next.js 16 (App Router)
- **CDN**: Cloudinary for image storage
- **Caching**: Basic Next.js fetch caching

### Audit Summary
ChatGPT performed a comprehensive audit identifying performance opportunities specific to serverless architecture. After validation against the actual codebase, we've confirmed several high-value optimizations that won't affect current functionality.

---

## Problem Statement

While the application functions well, there are specific optimization opportunities that will:

1. **Reduce Database Load**: Some queries overfetch data, pulling full related objects when only partial data is needed
2. **Improve Query Performance**: Missing indexes on frequently filtered columns (location, is_featured, reviews.studio_id)
3. **Optimize Image Delivery**: Inconsistent use of Next.js image optimization (some components use raw `<img>` tags)
4. **Enhance Caching**: Limited caching strategy for public, rarely-changing data
5. **Standardize UI Performance**: Multiple custom z-index values could be consolidated
6. **Serverless Best Practices**: Ensure optimal configuration for Vercel's serverless environment

---

## Validated Issues & Opportunities

### HIGH IMPACT

#### 1. Database Index Optimization
**Issue**: Missing indexes on frequently filtered columns  
**Impact**: Slower queries under load, especially for search and featured studios  
**Evidence**: 
- `studio_profiles` lacks index on `location` field
- `studio_profiles` lacks index on `is_featured` field  
- `reviews` lacks index on `studio_id` field (foreign key)

**Current Schema Indexes:**
```prisma
@@index([user_id])
@@index([city])
@@index([status])
@@index([is_premium])
@@index([is_verified])
@@index([is_featured])  // Already exists!
@@index([verification_level])
```

**Correction**: `is_featured` already has an index. Need to add:
- `location` (for location-based searches)
- `reviews.studio_id` (for review queries)

---

#### 2. Prisma Query Overfetching
**Issue**: Some queries include full related objects when only partial data is needed  
**Impact**: Larger payload sizes, slower queries, more bandwidth  
**Example**: `src/app/dashboard/page.tsx` lines 23-40

```typescript
db.studio_profiles.findMany({
  where: { user_id: session.user.id },
  include: {
    studio_services: true,  // Full objects
    studio_images: {
      take: 1,
      orderBy: { sort_order: 'asc' },
    },
    studio_studio_types: {
      select: {
        studio_type: true,
      },
    },
    _count: {
      select: { reviews: true },
    },
  },
```

The UI only uses limited fields from studio_services, but we're fetching all columns.

---

#### 3. Image Optimization Inconsistency
**Issue**: Two gallery components use raw `<img>` tags instead of Next.js Image component  
**Impact**: Unoptimized images, larger payloads, slower LCP, higher Vercel bandwidth costs  
**Files Affected**:
- `src/components/studio/ImageGallery.tsx` (line 179)
- `src/components/studio/EnhancedImageGallery.tsx` (line 174)

**Current Code:**
```typescript
<img
  src={image.url}
  alt={image.alt_text || 'Studio image'}
  className="w-full h-full object-cover"
  onError={...}
/>
```

**Other Components Correctly Using Next/Image:**
- ✅ `ModernStudioProfileV3.tsx`
- ✅ `CombinedCTASection.tsx`
- ✅ `StoryDemo2.tsx`
- ✅ `PageHero.tsx`

---

#### 4. Caching Strategy for Vercel Serverless
**Issue**: Limited use of Next.js caching mechanisms for public data  
**Impact**: Repeated expensive queries, higher database load, slower response times  
**Opportunities**:
- Featured studios list (changes infrequently)
- Studio profile pages (changes only on user edit)
- Search suggestions (could use short TTL cache)
- Public studio listings

**Current Implementation**: Basic fetch caching in search API (page 2+), but no revalidation tags

---

### MEDIUM IMPACT

#### 5. Search Performance
**Status**: ✅ Already Optimized (debouncing implemented)  
**Evidence**: `SearchAutocomplete.tsx` line 51 has 300ms debounce  
**Recommendation**: Add API rate limiting for additional protection

---

#### 6. Z-Index Standardization
**Issue**: 21 custom z-index values across 11 components using `z-[###]`  
**Impact**: Potential stacking conflicts, harder to maintain  
**Files Affected**: 11 components with z-index values  
**Recommendation**: Create z-index scale in Tailwind config

---

### LOW IMPACT / HYGIENE

#### 7. Environment Variable Validation
**Status**: ✅ Good (validated cloudinary.ts has guards)  
**Recommendation**: Document pattern for other services

---

## Proposed Solution

### Phase 1: Database Optimization (High Impact, Low Risk)

#### Task 1.1: Add Missing Database Indexes
**Effort**: 30 minutes  
**Risk**: Very Low

Add indexes to schema.prisma:

```prisma
model studio_profiles {
  // ... existing fields ...
  
  @@index([user_id])
  @@index([city])
  @@index([location])  // NEW - for location-based searches
  @@index([status])
  @@index([is_premium])
  @@index([is_verified])
  @@index([is_featured])
  @@index([verification_level])
}

model reviews {
  // ... existing fields ...
  
  @@index([studio_id])  // NEW - for review queries by studio
}
```

**Migration Steps:**
1. Update `prisma/schema.prisma`
2. Generate migration: `npm run db:migrate:dev`
3. Test locally
4. Review migration SQL
5. Apply to production: `npm run db:migrate:prod`

**Success Criteria:**
- Migration applies cleanly
- No performance regression
- Improved query times for location searches and review queries

---

#### Task 1.2: Optimize Prisma Queries (Select Instead of Include)
**Effort**: 2-3 hours  
**Risk**: Low (no functional changes)

Review and optimize queries that overfetch data:

**Target Files:**
- `src/app/dashboard/page.tsx`
- `src/app/api/studios/search/route.ts`
- `src/app/api/admin/studios/route.ts`

**Example Optimization:**

Before:
```typescript
include: {
  studio_services: true,  // Gets all columns
}
```

After:
```typescript
include: {
  studio_services: {
    select: {
      id: true,
      service: true,
      // Only fields actually used in UI
    }
  }
}
```

**Success Criteria:**
- Reduced query response sizes
- No UI functionality changes
- All existing features work identically

---

### Phase 2: Image Optimization (High Impact, Low Risk)

#### Task 2.1: Replace img with Next/Image in Gallery Components
**Effort**: 1-2 hours  
**Risk**: Low

Convert raw `<img>` tags to Next.js `<Image>` component in:
- `src/components/studio/ImageGallery.tsx`
- `src/components/studio/EnhancedImageGallery.tsx`

**Implementation:**

Before:
```typescript
<img
  src={image.url}
  alt={image.alt_text || 'Studio image'}
  className="w-full h-full object-cover"
/>
```

After:
```typescript
<Image
  src={image.url}
  alt={image.alt_text || 'Studio image'}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  loading="lazy"
/>
```

**Considerations:**
- Use `fill` prop for responsive containers
- Set appropriate `sizes` for responsive images
- Add `loading="lazy"` for below-fold images
- Maintain `onError` fallback logic

**Success Criteria:**
- All gallery images load correctly
- Improved LCP scores
- Cloudinary/Vercel automatic optimization applied
- No visual regressions

---

### Phase 3: Caching Strategy (High Impact, Medium Risk)

#### Task 3.1: Implement Next.js Data Caching with Revalidation
**Effort**: 3-4 hours  
**Risk**: Medium (requires careful testing)

Implement caching for frequently accessed, infrequently changing data:

**Featured Studios (Homepage):**
```typescript
// Cache for 1 hour, revalidate on demand
const featuredStudios = await db.studio_profiles.findMany({
  where: { is_featured: true },
  // ... select fields
});

export const revalidate = 3600; // 1 hour
```

**Studio Profile Pages:**
```typescript
// Cache individual studio pages
export const revalidate = 300; // 5 minutes

// Add revalidation tag for on-demand refresh
export async function generateStaticParams() {
  const studios = await db.studio_profiles.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true }
  });
  return studios.map(studio => ({ id: studio.id }));
}
```

**Search Suggestions API:**
```typescript
// Add short TTL cache for suggestions
import { unstable_cache } from 'next/cache';

const getCachedSuggestions = unstable_cache(
  async (query: string) => {
    // ... fetch logic
  },
  ['search-suggestions'],
  { revalidate: 60 } // 1 minute
);
```

**Revalidation Strategy:**
- Use `revalidatePath()` when studio is updated
- Use `revalidateTag()` for featured studios
- Implement in profile edit form and admin panel

**Success Criteria:**
- Reduced database queries for cached routes
- Proper cache invalidation on updates
- No stale data issues
- Faster page loads for cached content

---

#### Task 3.2: Add API Rate Limiting
**Effort**: 2 hours  
**Risk**: Low

Add rate limiting to protect search and suggestion endpoints:

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Optional: only if Upstash Redis is configured
export const ratelimit = process.env.UPSTASH_REDIS_URL 
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "10 s"),
    })
  : null;
```

**Target Endpoints:**
- `/api/search/suggestions` - 10 requests per 10 seconds
- `/api/studios/search` - 30 requests per minute

**Success Criteria:**
- Rate limits enforce without affecting normal usage
- Graceful degradation if Redis not configured
- Clear error messages for rate-limited requests

---

### Phase 4: UI/UX Polish (Low Impact, Low Risk)

#### Task 4.1: Standardize Z-Index Scale
**Effort**: 1 hour  
**Risk**: Very Low

Create standardized z-index scale in Tailwind config:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      zIndex: {
        'dropdown': '50',
        'sticky': '60',
        'overlay': '70',
        'modal': '80',
        'popover': '90',
        'tooltip': '100',
      }
    }
  }
}
```

Replace custom z-index values:
- `z-[50]` → `z-dropdown`
- `z-[60]` → `z-sticky`
- etc.

**Success Criteria:**
- All z-index values use named scales
- No stacking context conflicts
- Easier to maintain and debug

---

## Technical Implementation Details

### Database Migration Safety
1. **Index Creation**: Non-blocking in PostgreSQL, safe for production
2. **Testing**: Test migrations on local dev first, then staging
3. **Rollback Plan**: Indexes can be dropped if issues arise
4. **Performance**: Index creation may take 30-60 seconds on production DB

### Prisma Query Changes
1. **Testing Strategy**: Unit test all modified queries
2. **UI Verification**: Manual testing of affected pages
3. **Rollback Plan**: Simple revert of select/include changes
4. **No Breaking Changes**: Only internal optimization, same data returned

### Image Optimization
1. **Next/Image Requirements**: Ensure Cloudinary domain is in `next.config.js`
2. **Testing**: Visual regression testing for gallery components
3. **Fallback**: Maintain error handling for failed image loads
4. **Cloudinary Config**: Already configured and working

### Caching Strategy
1. **Testing**: Verify cache invalidation works correctly
2. **Monitoring**: Watch for stale data issues
3. **Gradual Rollout**: Start with long TTLs, optimize based on data
4. **Escape Hatch**: Can disable caching via config if issues arise

---

## Success Metrics

### Performance KPIs
- **Lighthouse Score**: Improve Performance score by 5-10 points
- **LCP (Largest Contentful Paint)**: Reduce by 20%
- **Database Query Time**: Reduce average query time by 15-25%
- **Vercel Bandwidth**: Reduce image bandwidth by 30-40%
- **Cold Start Time**: Maintain or improve current times

### Database Metrics
- **Index Usage**: Monitor index usage via Neon dashboard
- **Query Performance**: Measure before/after query times
- **Connection Pool**: Monitor connection usage

### User Experience
- **Page Load Time**: Faster initial page loads
- **Image Loading**: Improved progressive loading
- **Search Responsiveness**: Maintained or improved (already good)

---

## Implementation Timeline

### Week 1: Database Optimization
- **Days 1-2**: Add database indexes and test
- **Days 3-5**: Optimize Prisma queries and test

### Week 2: Image & Caching
- **Days 1-2**: Convert gallery components to Next/Image
- **Days 3-5**: Implement caching strategy with revalidation

### Week 3: Polish & Monitoring
- **Days 1-2**: Standardize z-index and add rate limiting
- **Days 3-5**: Monitor, measure, and fine-tune

**Total Timeline**: 3 weeks (can be parallelized)

---

## Risk Assessment

| Task | Risk Level | Mitigation |
|------|-----------|------------|
| Add DB Indexes | Very Low | Non-blocking operation, easily reversible |
| Optimize Queries | Low | No API changes, extensive testing |
| Image Optimization | Low | Maintain error handling, visual regression tests |
| Caching Strategy | Medium | Comprehensive cache invalidation, monitoring |
| Rate Limiting | Low | Graceful degradation if Redis not configured |
| Z-Index Standardization | Very Low | Visual testing only |

---

## Testing Strategy

### Automated Testing
- [ ] Unit tests for optimized query functions
- [ ] Integration tests for caching behavior
- [ ] Performance benchmarks for database queries
- [ ] Visual regression tests for gallery components

### Manual Testing
- [ ] Test all affected pages locally
- [ ] Verify cache invalidation works correctly
- [ ] Check image loading across devices
- [ ] Test search and autocomplete functionality
- [ ] Verify admin panel functionality

### Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Performance testing with real data
- [ ] Monitor for 24-48 hours before production

---

## Rollback Plan

Each phase has independent rollback strategy:

1. **Database Indexes**: Drop indexes via migration
2. **Query Optimization**: Revert to previous commit
3. **Image Components**: Revert component changes
4. **Caching**: Disable via config, no code changes needed
5. **Z-Index**: Revert Tailwind config

All changes are non-breaking and can be rolled back independently.

---

## Out of Scope

The following suggestions from the audit were investigated and found to be:

### Not Applicable
- ❌ **Client Components Overused**: No "use client" found in src/app pages (only in components where required)
- ❌ **Duplicate Data Fetching**: Queries are reasonably centralized
- ❌ **Dependency Bloat**: No duplicate date libraries found
- ❌ **Dead Files**: No unused hooks or components found

### Already Implemented
- ✅ **Prisma Singleton**: Already implemented in `src/lib/db.ts`
- ✅ **Search Debouncing**: Already implemented with 300ms debounce
- ✅ **Environment Validation**: Good patterns in place (e.g., `cloudinary.ts`)
- ✅ **is_featured Index**: Already exists in schema

---

## Future Considerations

### Potential Phase 2 Optimizations (Not in This PRD)
1. **Full-Text Search**: Implement PostgreSQL full-text search for better search performance
2. **Redis Caching Layer**: Add Redis for hot data (requires Upstash setup)
3. **Edge Runtime**: Evaluate which routes could benefit from Edge runtime
4. **Image CDN**: Optimize Cloudinary configuration (transforms, formats)
5. **Bundle Analysis**: Analyze and reduce JavaScript bundle size

---

## Approval & Sign-off

### Reviewers
- [ ] Technical Lead - Review technical approach
- [ ] Product Owner - Verify no functionality impact
- [ ] DevOps - Review deployment strategy

### Approval Status
- Status: **Awaiting Review**
- Approved By: _________________
- Date: _________________

---

## Appendix

### Audit Context
This PRD is based on a comprehensive audit performed by ChatGPT, with all findings validated against the actual codebase. Invalid or already-implemented suggestions were filtered out.

### Reference Files
- `src/lib/db.ts` - Prisma client singleton
- `prisma/schema.prisma` - Database schema
- `src/app/dashboard/page.tsx` - Dashboard data fetching
- `src/components/studio/ImageGallery.tsx` - Image gallery component
- `src/components/search/SearchAutocomplete.tsx` - Search with debouncing
- `package.json` - Dependencies

### Related Documentation
- [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md)
- [Database Documentation](README.md#database)
- [Deployment Guide](README.md#deployment)
- [Test Report](TEST_REPORT.md)

---

**End of PRD**

