# Product Requirements Document: Admin Site Merge

## Introduction/Overview

This PRD outlines the merger of the `vosf-old-site` admin interface into the main `vostudiofinder` application. Currently, maintaining two separate codebases with different frontends creates development challenges when database changes affect both sites. The goal is to consolidate the admin functionality into the main application under the `/admin` route structure, eliminating the need for a separate codebase while maintaining all existing admin functionality.

## Goals

1. **Consolidate Codebases:** Merge `vosf-old-site` functionality into `vostudiofinder` under `/admin` routes
2. **Unified Database Schema:** Create a single Prisma schema that combines both applications' data requirements
3. **Unified Authentication:** Implement a single authentication system that supports both regular users and admin users
4. **Maintain Functionality:** Ensure all existing admin features work identically after migration
5. **Improve Development Workflow:** Eliminate cross-codebase dependency issues
6. **Consistent UI/UX:** Create a hybrid admin interface that maintains functionality while adopting vostudiofinder styling

## User Stories

### Admin Users
- **As an admin user**, I want to access all admin functionality through `vostudiofinder.mpdee.co.uk/admin/dashboard` so that I can manage the database from a single interface
- **As an admin user**, I want to use the same authentication system as regular users so that I don't need separate login credentials
- **As an admin user**, I want the admin interface to look consistent with the main site while maintaining all existing functionality

### Developers
- **As a developer**, I want to work with a single codebase so that database changes don't break multiple applications
- **As a developer**, I want shared components between admin and public interfaces so that I can maintain consistency and reduce code duplication

### Regular Users
- **As a regular user**, I want the main site functionality to remain unchanged so that my experience is not disrupted

## Functional Requirements

### 1. Route Migration
1.1. The system must migrate all `vosf-old-site` routes to `/admin/*` structure in `vostudiofinder`
1.2. The system must maintain the following admin route mappings:
   - `/dashboard` → `/admin/dashboard`
   - `/studios` → `/admin/studios`
   - `/analytics` → `/admin/analytics`
   - `/network` → `/admin/network`
   - `/query` → `/admin/query`
   - `/schema` → `/admin/schema`
   - `/venues` → `/admin/venues`
   - `/faq` → `/admin/faq`
   - `/browse` → `/admin/browse`

### 2. Database Schema Unification
2.1. The system must create a unified Prisma schema that combines both applications' data requirements
2.2. The system must add missing admin models (Faq, Contact, Poi) to the existing Prisma schema
2.3. The system must maintain all existing data relationships and constraints
2.4. The system must ensure data integrity during the schema update process

### 3. Authentication System
3.1. The system must implement a unified authentication system that supports both regular and admin users
3.2. The system must maintain role-based access control for admin functionality
3.3. The system must provide seamless login experience for existing admin users
3.4. The system must secure all admin routes with proper authentication middleware

### 4. API Integration
4.1. The system must migrate all `vosf-old-site` API endpoints to follow `vostudiofinder` API patterns
4.2. The system must maintain all existing API functionality
4.3. The system must implement proper error handling and validation
4.4. The system must ensure API security for admin endpoints

### 5. Component Integration
5.1. The system must refactor both codebases to use shared components where possible
5.2. The system must maintain all existing admin functionality while adopting `vostudiofinder` styling
5.3. The system must ensure responsive design consistency across admin and public interfaces
5.4. The system must implement proper loading states and error handling

### 6. Environment Configuration
6.1. The system must merge both environment configurations into a single configuration
6.2. The system must maintain all necessary environment variables for both applications
6.3. The system must ensure proper environment variable documentation

### 7. File Structure Migration
7.1. The system must copy all necessary files from `vosf-old-site` to `vostudiofinder`
7.2. The system must organize admin-specific files under appropriate directories
7.3. The system must maintain proper import/export relationships
7.4. The system must update all file paths and references

## Non-Goals (Out of Scope)

- **Complete UI Redesign:** The admin interface will maintain its core functionality while adopting styling, not undergo a complete redesign
- **New Admin Features:** This migration focuses on preserving existing functionality, not adding new features
- **Performance Optimization:** While the unified codebase may improve performance, optimization is not a primary goal
- **Mobile Admin Interface:** The focus is on desktop admin functionality, mobile optimization is out of scope
- **Third-party Integration Changes:** Existing third-party integrations will be maintained as-is

## Design Considerations

### UI/UX Approach
- **Hybrid Design:** Maintain admin functionality while adopting `vostudiofinder` design system
- **Consistent Navigation:** Implement admin navigation that feels integrated with the main site
- **Responsive Design:** Ensure admin interface works on various screen sizes
- **Accessibility:** Maintain accessibility standards from both applications

### Component Strategy
- **Shared Components:** Create reusable components for common functionality (forms, tables, modals)
- **Admin-Specific Components:** Maintain specialized admin components where needed
- **Styling Consistency:** Use `vostudiofinder` Tailwind configuration and design tokens

## Technical Considerations

### Database Schema Update
- **Prisma Schema:** Add missing admin models to existing schema
- **Schema Migration:** Update existing Prisma schema with new admin models
- **Backup Strategy:** Implement proper backup procedures before schema changes
- **Rollback Plan:** Create rollback procedures in case of schema update issues

### Authentication Integration
- **JWT/Session Management:** Unify authentication tokens and session handling
- **Role Management:** Implement proper role-based access control
- **Security:** Ensure admin routes are properly secured

### API Architecture
- **Route Organization:** Organize admin API routes under `/api/admin/*` structure
- **Middleware:** Implement proper middleware for authentication and authorization
- **Error Handling:** Standardize error handling across all API endpoints

### Build and Deployment
- **Build Process:** Ensure unified build process works for both admin and public interfaces
- **Environment Variables:** Merge and document all environment variables
- **Deployment:** Update deployment configuration for unified application

## Success Metrics

### Functional Success
- **100% Feature Parity:** All existing admin functionality works identically after migration
- **Zero Data Loss:** All data is successfully migrated without loss or corruption
- **Authentication Success:** All existing admin users can log in and access their functionality

### Development Success
- **Single Codebase:** Successfully eliminate the need for `vosf-old-site` codebase
- **Reduced Complexity:** Eliminate cross-codebase dependency issues
- **Improved Workflow:** Developers can work on both admin and public features in one codebase

### User Experience Success
- **Seamless Access:** Admin users can access all functionality through the new `/admin` routes
- **Consistent Interface:** Admin interface feels integrated with the main site
- **No Disruption:** Regular users experience no changes to the main site functionality

## Open Questions

1. **Data Migration Timeline:** What is the preferred approach for data migration - gradual migration or big-bang migration?
2. **Testing Environment:** Should we set up a separate testing environment for the merged application before production deployment?
3. **Admin User Communication:** How should we communicate the URL changes to existing admin users?
4. **Legacy Code Cleanup:** What is the timeline for removing the `vosf-old-site` codebase after successful migration?
5. **Performance Monitoring:** Should we implement additional monitoring for the merged application?
6. **Documentation Updates:** What documentation needs to be updated to reflect the new unified structure?

## Implementation Phases

### Phase 1: Preparation and Analysis
- Analyze both codebases for dependencies and conflicts
- Create unified Prisma schema
- Set up development environment for merged application

### Phase 2: Core Migration
- Update database schema with admin models
- Implement unified authentication system
- Migrate core admin routes and components

### Phase 3: Integration and Testing
- Integrate admin interface with main application
- Implement shared components
- Comprehensive testing of all functionality

### Phase 4: Deployment and Cleanup
- Deploy merged application
- Update DNS and routing
- Remove `vosf-old-site` codebase
- Update documentation

## Risk Mitigation

### Technical Risks
- **Data Loss:** Implement comprehensive backup and testing procedures
- **Authentication Issues:** Thoroughly test authentication flow before deployment
- **Performance Impact:** Monitor performance during and after migration

### Business Risks
- **Admin Access Disruption:** Implement gradual migration with fallback options
- **User Experience Issues:** Maintain communication with admin users throughout process
- **Development Delays:** Plan for adequate testing and validation time

## Dependencies

- **Prisma Schema Migration:** Requires careful analysis of both database schemas
- **Authentication System:** May require updates to existing authentication infrastructure
- **Deployment Infrastructure:** May require updates to deployment configuration
- **DNS Configuration:** Will require updates to route admin traffic to new structure
