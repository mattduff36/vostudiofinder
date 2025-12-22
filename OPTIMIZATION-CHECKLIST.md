# Performance Optimization Checklist

Quick reference checklist for implementing the improvements from [PRD-PERFORMANCE-OPTIMIZATION.md](PRD-PERFORMANCE-OPTIMIZATION.md).

---

## 📋 Pre-Implementation

- [ ] Read full PRD: `PRD-PERFORMANCE-OPTIMIZATION.md`
- [ ] Review current performance baseline (Lighthouse, database query times)
- [ ] Backup database before migrations
- [ ] Create feature branch: `git checkout -b optimize/performance-improvements`

---

## 🗄️ Phase 1: Database Optimization

### Task 1.1: Add Database Indexes (30 min)
- [ ] Update `prisma/schema.prisma`:
  - [ ] Add `@@index([location])` to `studio_profiles`
  - [ ] Add `@@index([studio_id])` to `reviews`
- [ ] Run: `npm run db:migrate:dev`
- [ ] Review generated migration SQL
- [ ] Test locally - verify no errors
- [ ] Run: `npm run db:migrate:prod` (when ready for production)
- [ ] Monitor Neon dashboard for index creation

### Task 1.2: Optimize Prisma Queries (2-3 hours)
- [ ] **File: `src/app/dashboard/page.tsx`**
  - [ ] Replace `studio_services: true` with selective `select`
  - [ ] Review all `include` statements
  - [ ] Test dashboard page functionality
  
- [ ] **File: `src/app/api/studios/search/route.ts`**
  - [ ] Audit all includes in search query
  - [ ] Use `select` for minimal necessary fields
  - [ ] Test search results
  
- [ ] **File: `src/app/api/admin/studios/route.ts`**
  - [ ] Optimize admin studio list query
  - [ ] Test admin panel

- [ ] Run all affected pages and verify functionality
- [ ] Check network tab for reduced payload sizes

---

## 🖼️ Phase 2: Image Optimization

### Task 2.1: Convert Gallery Components to Next/Image (1-2 hours)
- [ ] **File: `src/components/studio/ImageGallery.tsx`**
  - [ ] Import Next.js `Image` component
  - [ ] Replace `<img>` tag (line ~179) with `<Image>`
  - [ ] Add `fill` prop
  - [ ] Add `sizes` attribute
  - [ ] Add `loading="lazy"`
  - [ ] Maintain `onError` logic
  - [ ] Test gallery drag-and-drop
  - [ ] Test gallery image display

- [ ] **File: `src/components/studio/EnhancedImageGallery.tsx`**
  - [ ] Import Next.js `Image` component
  - [ ] Replace `<img>` tag (line ~174) with `<Image>`
  - [ ] Add `fill` prop
  - [ ] Add `sizes` attribute
  - [ ] Add `loading="lazy"`
  - [ ] Maintain `onError` logic
  - [ ] Test enhanced gallery features
  - [ ] Test image preview functionality

- [ ] Visual regression testing:
  - [ ] Test on mobile devices
  - [ ] Test on desktop
  - [ ] Test on different studio profiles
  - [ ] Verify image aspect ratios maintained
  - [ ] Check image loading performance

- [ ] Verify Cloudinary domain in `next.config.js`

---

## ⚡ Phase 3: Caching Strategy

### Task 3.1: Implement Data Caching (3-4 hours)

#### Featured Studios Homepage
- [ ] **File: `src/app/page.tsx`** (or wherever featured studios are fetched)
  - [ ] Add `export const revalidate = 3600;` (1 hour)
  - [ ] Add revalidation tags: `['featured-studios']`
  - [ ] Test featured studios display
  - [ ] Test cache behavior

#### Studio Profile Pages
- [ ] **File: `src/app/studio/[id]/page.tsx`** (or equivalent)
  - [ ] Add `export const revalidate = 300;` (5 minutes)
  - [ ] Add revalidation tags per studio
  - [ ] Implement `generateStaticParams()` if beneficial
  - [ ] Test individual studio pages

#### Search Suggestions API
- [ ] **File: `src/app/api/search/suggestions/route.ts`** (or equivalent)
  - [ ] Import `unstable_cache` from Next
  - [ ] Wrap suggestions logic with cache (60s TTL)
  - [ ] Test search suggestions

#### Cache Invalidation
- [ ] **File: Studio edit form(s)**
  - [ ] Add `revalidatePath()` on studio update
  - [ ] Add `revalidateTag()` for featured studios
  - [ ] Test cache invalidation works
  
- [ ] **File: Admin panel studio updates**
  - [ ] Add cache revalidation on admin edits
  - [ ] Test admin cache invalidation

- [ ] Test full cache lifecycle:
  - [ ] Verify data is cached initially
  - [ ] Verify cache returns on subsequent requests
  - [ ] Verify updates invalidate cache
  - [ ] Verify fresh data after invalidation

### Task 3.2: Add API Rate Limiting (2 hours)
- [ ] Check if Upstash Redis is available
- [ ] Create `src/lib/rate-limit.ts`
- [ ] Implement graceful degradation (optional Redis)
- [ ] Apply to `/api/search/suggestions` (10 req/10s)
- [ ] Apply to `/api/studios/search` (30 req/min)
- [ ] Test rate limiting behavior
- [ ] Test graceful degradation without Redis

---

## 🎨 Phase 4: UI/UX Polish

### Task 4.1: Standardize Z-Index (1 hour)
- [ ] **File: `tailwind.config.ts`**
  - [ ] Add z-index scale to theme.extend
  - [ ] Define semantic names (dropdown, modal, overlay, etc.)

- [ ] Replace custom z-index across components (11 files):
  - [ ] `src/components/admin/EditStudioModal.tsx`
  - [ ] `src/components/profile/ProfileEditButton.tsx`
  - [ ] `src/components/navigation/Navbar.tsx`
  - [ ] `src/components/studio/profile/mobile/MapFullscreen.tsx`
  - [ ] `src/components/navigation/MobileMenu.tsx`
  - [ ] `src/components/search/mobile/FilterDrawer.tsx`
  - [ ] `src/components/search/mobile/MapCollapsible.tsx`
  - [ ] `src/components/search/EnhancedLocationFilter.tsx`
  - [ ] `src/components/home/FeaturedStudios.tsx`
  - [ ] `src/components/search/EnhancedSearchBar.tsx`
  - [ ] `src/components/maps/StudioMarkerModal.tsx`

- [ ] Test z-index stacking across the app
- [ ] Verify no modal/dropdown conflicts

---

## ✅ Testing & Validation

### Automated Testing
- [ ] Run existing test suite: `npm test`
- [ ] Add new unit tests for optimized queries
- [ ] Add integration tests for caching
- [ ] Run type checking: `npm run type-check`
- [ ] Run linter: `npm run lint`

### Manual Testing Checklist
- [ ] **Homepage**
  - [ ] Featured studios load correctly
  - [ ] Images optimized and load quickly
  - [ ] No visual regressions

- [ ] **Search**
  - [ ] Search autocomplete works
  - [ ] Search results load correctly
  - [ ] Location-based search works
  - [ ] Filters work correctly

- [ ] **Studio Pages**
  - [ ] Individual studio pages load
  - [ ] Image galleries display correctly
  - [ ] Drag-and-drop still works (edit mode)
  - [ ] Image optimization applied

- [ ] **Dashboard**
  - [ ] User dashboard loads
  - [ ] Studio list displays correctly
  - [ ] Reviews display correctly
  - [ ] Messages display correctly

- [ ] **Admin Panel**
  - [ ] Studio list loads
  - [ ] Studio editing works
  - [ ] Cache invalidation works

### Performance Testing
- [ ] Run Lighthouse audit (before/after):
  - [ ] Performance score
  - [ ] LCP (Largest Contentful Paint)
  - [ ] FID (First Input Delay)
  - [ ] CLS (Cumulative Layout Shift)

- [ ] Database query performance:
  - [ ] Measure query times before/after
  - [ ] Check Neon dashboard for index usage
  - [ ] Monitor connection pool

- [ ] Image performance:
  - [ ] Check Network tab for image sizes
  - [ ] Verify WebP/AVIF formats used
  - [ ] Check Cloudinary transformations applied

- [ ] Caching effectiveness:
  - [ ] Monitor cache hit rates
  - [ ] Verify reduced database queries
  - [ ] Check response times

---

## 🚀 Deployment

### Staging Deployment
- [ ] Merge to staging branch
- [ ] Deploy to Vercel staging
- [ ] Run database migrations on staging
- [ ] Full test suite on staging
- [ ] Monitor for 24-48 hours
- [ ] Check Vercel analytics
- [ ] Review error logs

### Production Deployment
- [ ] Final code review
- [ ] Merge to main branch
- [ ] Run production database migrations
- [ ] Deploy to production
- [ ] Monitor immediately after deploy:
  - [ ] Check error rates (Sentry)
  - [ ] Monitor performance (Vercel Analytics)
  - [ ] Watch database load (Neon)
  - [ ] Check user reports

### Post-Deployment Monitoring (48 hours)
- [ ] Monitor Lighthouse scores
- [ ] Monitor Vercel analytics
- [ ] Monitor database performance
- [ ] Monitor error rates
- [ ] Check user feedback
- [ ] Review bandwidth usage

---

## 📊 Success Criteria

### Performance Improvements
- [ ] Lighthouse Performance score +5-10 points
- [ ] LCP reduced by 20%
- [ ] Database query time reduced by 15-25%
- [ ] Vercel bandwidth reduced by 30-40%
- [ ] No increase in cold start times

### Functional Verification
- [ ] All existing features work identically
- [ ] No visual regressions
- [ ] No new errors in logs
- [ ] User experience maintained or improved

---

## 🔄 Rollback Plan

If issues arise, rollback steps:

1. **Database Indexes**
   - [ ] Create rollback migration to drop indexes
   - [ ] Run: `npm run db:migrate:prod`

2. **Code Changes**
   - [ ] Revert to previous commit: `git revert [commit-hash]`
   - [ ] Deploy reverted code
   - [ ] Verify functionality restored

3. **Caching Issues**
   - [ ] Disable caching in affected pages
   - [ ] Remove `revalidate` exports temporarily
   - [ ] Investigate and fix issue
   - [ ] Re-enable caching

---

## 📝 Notes & Observations

### Performance Baseline (Before)
- Lighthouse Performance: ___
- Average LCP: ___
- Average query time: ___
- Vercel bandwidth/month: ___

### Performance Results (After)
- Lighthouse Performance: ___
- Average LCP: ___
- Average query time: ___
- Vercel bandwidth/month: ___

### Issues Encountered
_Document any issues encountered during implementation:_

---

### Lessons Learned
_Document lessons learned for future optimizations:_

---

## 🎯 Quick Win Priority

If short on time, implement in this order for maximum impact:

1. **Database Indexes** (30 min) - Immediate query performance boost
2. **Image Optimization** (1-2 hours) - Significant bandwidth savings
3. **Featured Studios Caching** (1 hour) - Reduce homepage load
4. **Query Optimization** (2-3 hours) - Ongoing performance improvement

---

**Related Documents:**
- [Full PRD](PRD-PERFORMANCE-OPTIMIZATION.md)
- [Test Report](TEST_REPORT.md)
- [Environment Setup](docs/ENVIRONMENT_SETUP.md)

