# Tasks for Membership Workflow Transformation

Based on: prd-membership-workflow-transformation.md

## Relevant Files

- `src/middleware.ts` - Authentication middleware that needs updating to allow public access to studio routes
- `src/components/home/HeroSection.tsx` - Main hero section containing "Join Free" CTAs that need updating
- `src/components/home/CTASection.tsx` - Call-to-action section with membership messaging
- `src/components/home/Footer.tsx` - Footer containing signup links and messaging
- `src/components/auth/SignupForm.tsx` - Signup form that needs payment integration
- `src/app/auth/signup/page.tsx` - Signup page requiring membership payment flow
- `src/app/studios/page.tsx` - Studios listing page that should be publicly accessible
- `src/app/studio/[id]/page.tsx` - Individual studio profile pages for public viewing
- `src/lib/auth.ts` - Authentication configuration and session handling
- `src/app/api/studios/search/route.ts` - Studio search API that should be public
- `src/components/studio/ContactStudio.tsx` - Contact component for public users
- `src/components/reviews/ReviewsList.tsx` - Reviews display for public viewing

### Notes

- Unit tests should be placed alongside components (e.g., `HeroSection.tsx` and `HeroSection.test.tsx`)
- Use `npm test` to run all Jest tests
- Use `npm run test:watch` for development testing
- Integration tests for API routes should be in `__tests__/api/` directory

## Tasks

- [x] 1.0 Configure Public Access and Middleware Updates
  - [x] 1.1 Update `src/middleware.ts` to remove authentication requirements for `/studios` and `/studio/[id]` routes
  - [x] 1.2 Modify `src/middleware.ts` to allow public access to studio search API (`/api/studios/search`)
  - [x] 1.3 Update `publicPaths` array in middleware to include all studio-related routes
  - [x] 1.4 Test middleware changes to ensure public users can access studio content without authentication
  - [x] 1.5 Verify that protected routes (dashboard, profile, admin) still require authentication
  - [x] 1.6 Update `src/lib/auth.ts` configuration to support mixed public/private access patterns

- [ ] 2.0 Update Site Messaging and Call-to-Action Elements
  - [x] 2.1 Replace "Join Free" button in `src/components/home/HeroSection.tsx` with "List Your Studio"
  - [x] 2.2 Update CTA messaging in `src/components/home/CTASection.tsx` to reflect membership model
  - [x] 2.3 Modify footer links in `src/components/home/Footer.tsx` to use membership messaging
  - [x] 2.4 Update navigation menu items to replace free signup links with membership CTAs
  - [x] 2.5 Add pricing information display (£25/year) near signup CTAs
  - [x] 2.6 Create clear value proposition messaging for studio owners about membership benefits
  - [x] 2.7 Update meta descriptions and page titles to reflect public browsing capability

- [ ] 3.0 Implement Membership Payment Gate for Account Creation
  - [ ] 3.1 Modify `src/app/auth/signup/page.tsx` to redirect to payment flow before account creation
  - [ ] 3.2 Update `src/components/auth/SignupForm.tsx` to integrate with Stripe payment for £25/year
  - [ ] 3.3 Create new payment component for membership signup flow
  - [ ] 3.4 Update `src/app/api/auth/register/route.ts` to verify payment completion before creating account
  - [ ] 3.5 Implement membership status validation in user creation process
  - [ ] 3.6 Add membership expiration tracking and renewal reminder system
  - [ ] 3.7 Create admin interface for managing membership status and payments
  - [ ] 3.8 Update existing Stripe webhook handlers to process membership payments

- [ ] 4.0 Ensure Public Studio Content Accessibility
  - [ ] 4.1 Verify `src/app/studios/page.tsx` displays all studios without authentication requirements
  - [ ] 4.2 Ensure `src/app/studio/[id]/page.tsx` shows complete studio information to public users
  - [ ] 4.3 Update `src/components/studio/ContactStudio.tsx` to display contact information publicly
  - [ ] 4.4 Modify `src/components/reviews/ReviewsList.tsx` to show all reviews to public users
  - [ ] 4.5 Ensure studio search functionality works for non-authenticated users
  - [ ] 4.6 Add proper SEO meta tags and structured data to public studio pages
  - [ ] 4.7 Implement breadcrumb navigation for public studio browsing
  - [ ] 4.8 Test that all studio images and media are accessible to public users

- [ ] 5.0 Test and Validate Membership Workflow Implementation
  - [ ] 5.1 Create comprehensive test suite for public browsing functionality
  - [ ] 5.2 Test membership payment flow from start to account creation completion
  - [ ] 5.3 Verify that existing developer accounts remain active without payment requirements
  - [ ] 5.4 Test that legacy imported accounts maintain their current status
  - [ ] 5.5 Validate SEO functionality - ensure search engines can crawl public content
  - [ ] 5.6 Perform cross-browser testing for public studio browsing experience
  - [ ] 5.7 Test mobile responsiveness for public users browsing studios
  - [ ] 5.8 Validate payment processing and membership activation workflow
  - [ ] 5.9 Test error handling for failed payments and edge cases
  - [ ] 5.10 Conduct user acceptance testing with sample public users and potential members
