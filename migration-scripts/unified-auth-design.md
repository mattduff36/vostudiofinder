# Unified Authentication System Design

## Overview
Design for a unified authentication system that supports both regular users and admin users using the existing NextAuth.js infrastructure.

## System Architecture

### Base System: NextAuth.js
- **Framework**: NextAuth.js v4 (existing)
- **Database**: Prisma with PostgreSQL (existing)
- **Session Strategy**: JWT (existing)
- **Password Hashing**: bcryptjs (existing)

### User Roles
- **USER**: Basic user access
- **STUDIO_OWNER**: Can manage studios
- **ADMIN**: Full admin access (new requirement)

## Authentication Flow

### 1. User Registration/Login
```
User → NextAuth.js → Database → JWT Token → Session
```

### 2. Role-Based Access Control
```
Request → Middleware → Check Role → Allow/Deny
```

### 3. Admin Access
```
Admin User → NextAuth.js → ADMIN Role → Admin Routes
```

## Implementation Details

### 1. Admin User Creation
- Create admin user in database with ADMIN role
- Use existing user table structure
- Set proper credentials and permissions

### 2. Middleware Updates
- Extend existing middleware to handle admin routes
- Add admin-specific route protection
- Maintain existing role-based access control

### 3. Route Protection
- `/admin/*` - ADMIN role required
- `/api/admin/*` - ADMIN role required
- Existing routes maintain current protection

### 4. Session Management
- Use existing JWT session strategy
- Include role information in JWT token
- Maintain session persistence

## Security Considerations

### 1. Password Security
- Use strong passwords for admin accounts
- Implement password complexity requirements
- Consider password rotation policies

### 2. Session Security
- JWT tokens are stateless and secure
- Implement proper token expiration
- Add session timeout for admin users

### 3. Access Control
- Implement audit logging for admin actions
- Consider IP restrictions for admin access
- Add two-factor authentication for admin users

## Migration Strategy

### Phase 1: Admin User Setup
1. Create admin user in database
2. Set ADMIN role
3. Configure credentials
4. Test admin access

### Phase 2: Middleware Updates
1. Update middleware for admin routes
2. Add admin route protection
3. Test role-based access control
4. Verify session management

### Phase 3: Admin Interface Integration
1. Ensure admin pages work with NextAuth
2. Test admin functionality
3. Verify authentication flow
4. Test logout functionality

### Phase 4: Testing and Validation
1. Test admin login/logout
2. Test admin route access
3. Test role-based permissions
4. Test session persistence
5. Security testing

## Benefits

### 1. Unified System
- Single authentication system for all users
- Consistent user experience
- Simplified maintenance

### 2. Enhanced Security
- OAuth support for admin users
- Advanced security features
- Role-based access control

### 3. Scalability
- Easy to add more admin users
- Flexible role management
- Future-proof architecture

### 4. Consistency
- Same authentication flow for all users
- Unified session management
- Consistent error handling

## Implementation Files

### 1. Database Schema
- Use existing user table
- Add ADMIN role to enum
- No schema changes needed

### 2. Authentication Configuration
- Extend existing NextAuth.js config
- Add admin-specific callbacks
- Maintain existing providers

### 3. Middleware
- Update existing middleware
- Add admin route protection
- Maintain existing functionality

### 4. Admin Components
- Create admin-specific components
- Use existing authentication hooks
- Maintain consistent UI

## Testing Strategy

### 1. Unit Tests
- Test authentication functions
- Test role-based access control
- Test session management

### 2. Integration Tests
- Test admin login flow
- Test admin route access
- Test role-based permissions

### 3. Security Tests
- Test authentication bypass
- Test role escalation
- Test session hijacking

### 4. User Acceptance Tests
- Test admin user experience
- Test regular user experience
- Test error handling

## Conclusion

The unified authentication system will provide:
- Enhanced security with OAuth support
- Scalable user management
- Consistent authentication flow
- Role-based access control
- Admin functionality support

This design maintains the advanced features of the main application while providing the admin functionality needed for the merged application.
