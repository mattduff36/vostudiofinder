# PRD: Membership Workflow Transformation

## Introduction/Overview

Transform VoiceoverStudioFinder from a free registration platform to a public browsing platform with paid membership for studio listings. This change enables anyone to browse and book studios directly while generating revenue exclusively from studio owners who pay £25/year to list their facilities. The feature solves the core business model challenge by creating a sustainable revenue stream while maximizing public accessibility for discovery and booking.

**Goal:** Implement a paid membership model where public users can browse all content freely, but only paying members can create studio listing accounts.

## Goals

1. **Enable Public Access**: Allow anyone to browse all studio profiles, search, view details, contact information, and reviews without authentication
2. **Implement Paid Membership Gate**: Require £25/year payment for studio owners to create accounts and list their facilities  
3. **Maintain User Experience**: Ensure seamless browsing and booking experience for voice artists seeking studios
4. **Generate Sustainable Revenue**: Create clear revenue stream from studio owner memberships
5. **Preserve SEO Value**: Ensure all studio content is publicly accessible for search engine indexing
6. **Update Site Messaging**: Replace all "Join Free" CTAs with "List Your Studio" membership prompts

## User Stories

### Public Users (Voice Artists/Clients)
- **As a voice artist**, I want to browse all studio profiles without creating an account so that I can quickly find suitable recording facilities
- **As a voice artist**, I want to search and filter studios by location and services so that I can find studios that meet my specific needs
- **As a voice artist**, I want to view complete studio details including contact information so that I can book directly with the studio owner
- **As a voice artist**, I want to read reviews and ratings so that I can make informed decisions about studio quality
- **As a potential client**, I want to access all studio information immediately so that I can book services without registration barriers

### Studio Owners (Paid Members)
- **As a studio owner**, I want to pay £25/year to list my studio so that I can advertise my services to voice artists
- **As a studio owner**, I want to create and manage my studio profile so that I can showcase my facilities and services
- **As a studio owner**, I want to receive direct bookings from the public so that I can generate business from the platform
- **As a studio owner**, I want my listing to be publicly visible so that I can maximize exposure to potential clients

### Existing Users (Migration)
- **As an existing user from the old site**, I want the option to reactivate my profile by paying for membership so that I can continue using the platform
- **As a developer/admin**, I want to maintain test accounts without payment so that I can continue development and testing

## Functional Requirements

### Public Access Requirements
1. **Homepage Access**: The system must allow all users to access the homepage without authentication
2. **Studio Browsing**: The system must allow all users to browse the complete studio directory (`/studios`) without login
3. **Studio Profiles**: The system must allow all users to view individual studio profiles (`/studio/[id]`) with complete information
4. **Search Functionality**: The system must provide full search and filtering capabilities to non-authenticated users
5. **Contact Information**: The system must display studio contact details to all users for direct booking
6. **Reviews Display**: The system must show all reviews and ratings to public users
7. **SEO Optimization**: The system must ensure all public content is crawlable by search engines

### Membership Requirements  
8. **Payment Gate**: The system must require £25/year payment before allowing account creation
9. **Studio Account Creation**: The system must only allow paid members to create studio listing accounts
10. **Profile Management**: The system must allow paid members to create, edit, and manage their studio profiles
11. **Membership Validation**: The system must verify active membership status before granting account access
12. **Payment Processing**: The system must integrate with payment processor (Stripe) for membership fees

### User Interface Requirements
13. **CTA Updates**: The system must replace all "Join Free" buttons with "List Your Studio" messaging
14. **Navigation Updates**: The system must update navigation to reflect membership model
15. **Pricing Display**: The system must clearly display membership pricing before signup
16. **Public Browsing Indicators**: The system must make it clear that browsing is free but listing requires membership

### Data & Migration Requirements
17. **Developer Accounts**: The system must maintain active status for 2 specified developer accounts
18. **Legacy Data**: The system must keep existing imported accounts active for testing purposes
19. **Account Deactivation**: The system must provide capability to deactivate test accounts when going live
20. **Future Reactivation**: The system must support future email invitation system for legacy users

## Non-Goals (Out of Scope)

- **Premium Membership Tiers**: Advanced membership levels are planned for future but not included in this release
- **Email Invitation System**: Automated legacy user reactivation emails will be implemented later
- **Review Submission by Public**: Only viewing reviews is public; submission may require membership (to be clarified)
- **Advanced Booking System**: Direct booking integration beyond contact information display
- **Multi-language Support**: International expansion features
- **Mobile App**: Focus is on web platform only

## Design Considerations

- **Maintain Current Design**: Preserve existing visual design and user experience flow
- **Clear Value Proposition**: Membership signup flow must clearly communicate benefits of £25/year listing
- **Seamless Public Experience**: No authentication barriers or prompts should interrupt browsing
- **CTA Placement**: "List Your Studio" buttons should replace "Join Free" in hero sections, navigation, and footer
- **Payment Flow**: Integrate membership payment as first step of account creation process

## Technical Considerations

- **Middleware Updates**: Modify authentication middleware to allow public access to studio routes
- **API Endpoints**: Ensure studio search and profile APIs are publicly accessible
- **Payment Integration**: Maintain existing Stripe integration for £25/year membership fees
- **Database Schema**: No changes required; use existing user roles and membership status fields
- **SEO Implementation**: Ensure proper meta tags and structured data for public studio pages
- **Performance**: Public pages should load quickly without authentication overhead

## Success Metrics

### Business Metrics
- **Revenue Generation**: Track monthly recurring revenue from £25/year memberships
- **Conversion Rate**: Measure percentage of public browsers who become paying members
- **Member Retention**: Monitor annual renewal rates for studio owner memberships

### User Engagement Metrics  
- **Public Traffic**: Increase in organic traffic to studio profiles and search pages
- **Session Duration**: Longer browsing sessions due to unrestricted access
- **Direct Bookings**: Track contact form submissions and direct studio bookings
- **Search Usage**: Increased usage of search and filtering features

### Technical Metrics
- **Page Load Speed**: Maintain <2 second load times for public pages
- **SEO Performance**: Improved search engine rankings for studio-related keywords  
- **Conversion Funnel**: Track progression from browsing to membership signup

## Open Questions

1. **Review Submission**: Should public users be able to submit reviews, or is this a member-only feature?
2. **Contact Forms**: Should there be platform-integrated contact forms, or just display contact information?
3. **Legacy User Timeline**: When should the email invitation system for legacy users be implemented?
4. **Premium Features**: What additional features should be considered for future premium membership tiers?
5. **Analytics**: What additional tracking is needed to measure the success of this business model change?

---

**Target Audience**: Junior Developer
**Implementation Priority**: High  
**Estimated Timeline**: 2-3 weeks
**Dependencies**: Payment system (Stripe), existing authentication system
