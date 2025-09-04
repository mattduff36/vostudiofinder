# New Voiceover Studio Finder - Site Roadmap & User Flow Analysis

## 🎯 Site Overview
**Business Model**: Authentication-required for ALL interactions
- **Public Access**: ❌ Limited - Only homepage hero/marketing content
- **Member Access**: ✅ Full access to browse, search, create profiles
- **Payment Required**: For premium features and studio owner role upgrade
- **Technology**: Modern Next.js 15, React 19, PostgreSQL, NextAuth.js

---

## 📊 Mermaid Flow Diagram

```mermaid
graph TD
    A[Homepage - /] --> B{User Authenticated?}
    B -->|No| C[Hero Section Only]
    B -->|Yes| D[Full Homepage with Studios]
    
    C --> E[Sign In - /auth/signin]
    C --> F[Sign Up - /auth/signup]
    
    %% Authentication Flow
    E --> G[Login Options]
    G --> H[Email/Password]
    G --> I[Google OAuth]
    G --> J[Facebook OAuth]  
    G --> K[Twitter OAuth]
    
    F --> L[Registration Form]
    L --> M[Email/Password Signup]
    L --> N[OAuth Signup]
    
    H --> O{Valid Credentials?}
    O -->|No| E
    O -->|Yes| P[Redirect to Dashboard]
    
    I --> Q[OAuth Flow]
    J --> Q
    K --> Q
    Q --> R[Account Created/Linked]
    R --> P
    
    M --> S[Account Created]
    S --> T[Email Verification - /auth/verify-email]
    T --> P
    
    %% Password Recovery
    E --> U[Forgot Password - /auth/forgot-password]
    U --> V[Password Reset Email]
    V --> W[Reset Password - /auth/reset-password]
    W --> E
    
    %% Authenticated User Flow
    P[Dashboard - /dashboard] --> X[User Activities Overview]
    X --> Y[My Studios]
    X --> Z[My Reviews]
    X --> AA[Messages]
    X --> AB[Connections]
    
    %% Studio Discovery (Auth Required)
    B -->|Yes| AC[Browse Studios - /studios]
    AC --> AD[Studio Search & Filters]
    AD --> AE[Location Search]
    AD --> AF[Service Type Filter]
    AD --> AG[Studio Type Filter]
    AD --> AH[Premium/Verified Filter]
    
    AC --> AI[Studio Profile - /studio/[id]]
    AI --> AJ[Studio Details]
    AI --> AK[Studio Images Gallery]
    AI --> AL[Studio Services]
    AI --> AM[Studio Location/Map]
    AI --> AN[Studio Reviews]
    
    %% Studio Interaction (Auth Required)
    AI --> AO{User Role?}
    AO -->|USER| AP[Leave Review]
    AO -->|USER| AQ[Send Message]
    AO -->|USER| AR[Add Connection]
    AO -->|STUDIO_OWNER| AS[Manage Own Studio]
    AO -->|ADMIN| AT[Admin Actions]
    
    %% Profile Management (Auth Required)
    P --> AU[Profile Settings - /profile]
    AU --> AV[Edit Display Name]
    AU --> AW[Edit Username]
    AU --> AX[Upload Avatar]
    AU --> AY[Account Settings]
    
    %% Studio Creation Flow
    P --> AZ{User Role?}
    AZ -->|USER| BA[Upgrade to Studio Owner]
    AZ -->|STUDIO_OWNER| BB[Create Studio - /studio/create]
    AZ -->|ADMIN| BB
    
    BA --> BC[Payment Required]
    BC --> BD[Stripe Checkout]
    BC --> BE[PayPal Checkout]
    BD --> BF[Payment Success]
    BE --> BF
    BF --> BG[Role Upgraded to STUDIO_OWNER]
    BG --> BB
    
    BB --> BH[Studio Creation Form]
    BH --> BI[Basic Information]
    BH --> BJ[Location & Address]
    BH --> BK[Services Offered]
    BH --> BL[Studio Images Upload]
    BH --> BM[Contact Information]
    BH --> BN[Studio Type Selection]
    
    BH --> BO[Submit for Review]
    BO --> BP[Admin Verification Required]
    BP --> BQ[Studio Published]
    BQ --> AC
    
    %% Admin Features
    P --> BR{Admin User?}
    BR -->|Yes| BS[Admin Panel - /admin]
    BS --> BT[User Management]
    BS --> BU[Studio Verification]
    BS --> BV[Content Moderation]
    BS --> BW[Refund Management]
    BS --> BX[System Statistics]
    
    %% Communication System (Auth Required)
    AA --> BY[View Messages - API]
    BY --> BZ[Message Threads]
    BZ --> CA[Send Reply]
    BZ --> CB[Archive Message]
    
    AB --> CC[View Connections - API]
    CC --> CD[Connection Requests]
    CC --> CE[Accept/Decline Requests]
    CC --> CF[Send Connection Request]
    
    %% Review System (Auth Required)
    AN --> CG[Leave Review - API]
    CG --> CH[Rating & Content]
    CH --> CI[Submit Review]
    CI --> CJ[Review Pending Approval]
    CJ --> CK[Review Published]
    
    %% Search & Discovery (Auth Required)
    AD --> CL[Search API - /api/studios/search]
    CL --> CM[Location-based Results]
    CL --> CN[Service-based Results]
    CL --> CO[Text Search Results]
    
    %% Payment System
    BF --> CP[Subscription Management]
    CP --> CQ[View Invoices]
    CP --> CR[Download Invoice - /api/user/invoices/[id]/download]
    CP --> CS[Manage Subscription]
    
    %% Data & Privacy (Auth Required)
    AU --> CT[GDPR Compliance]
    CT --> CU[Data Export - /api/user/data-export]
    CT --> CV[Delete Account - /api/user/delete-account]
    
    %% Error States
    O -->|Invalid| CW[Error Handling]
    BP -->|Rejected| CX[Studio Rejected]
    CI -->|Failed| CY[Review Failed]
    
    %% Unauthorized Access
    B -->|No + Protected Route| CZ[Unauthorized - /unauthorized]
    CZ --> E
    
    %% Mobile/API Integration
    P --> DA[API Endpoints]
    DA --> DB[RESTful APIs]
    DA --> DC[Real-time Features]
    DA --> DD[Mobile App Support]
```

---

## 🚪 Access Control Matrix

| Feature/Page | Public Access | Authenticated User | Studio Owner | Admin |
|--------------|---------------|-------------------|--------------|-------|
| **Homepage** | ✅ Hero Only | ✅ Full Content | ✅ Full Content | ✅ Full Content |
| **Browse Studios** | ❌ | ✅ Full | ✅ Full | ✅ Full |
| **View Profiles** | ❌ | ✅ Full | ✅ Full | ✅ Full |
| **Search/Filter** | ❌ | ✅ Full | ✅ Full | ✅ Full |
| **Create Account** | ✅ Free | ✅ | ✅ | ✅ |
| **Create Studio** | ❌ | ❌ Pay Required | ✅ | ✅ |
| **Send Messages** | ❌ | ✅ | ✅ | ✅ |
| **Leave Reviews** | ❌ | ✅ | ✅ | ✅ |
| **Admin Panel** | ❌ | ❌ | ❌ | ✅ |

---

## 📁 Key File Structure

### **Next.js App Router Structure**
```
src/app/
├── page.tsx                 # Homepage (public + auth content)
├── layout.tsx              # Root layout with session
├── auth/
│   ├── signin/page.tsx     # Login page
│   ├── signup/page.tsx     # Registration page
│   ├── forgot-password/    # Password recovery
│   └── verify-email/       # Email verification
├── dashboard/page.tsx      # User dashboard (auth required)
├── studios/page.tsx        # Studio directory (auth required)
├── studio/
│   ├── [id]/page.tsx      # Studio profile (auth required)
│   └── create/page.tsx    # Studio creation (role required)
├── profile/page.tsx        # User profile settings (auth required)
├── admin/page.tsx          # Admin panel (admin only)
└── api/                    # API routes
    ├── auth/              # Authentication endpoints
    ├── studios/           # Studio CRUD operations
    ├── reviews/           # Review system
    ├── messages/          # Messaging system
    └── user/              # User management
```

### **Authentication System**
- `src/lib/auth.ts` - NextAuth.js configuration
- `src/lib/auth-guards.ts` - Server-side route protection
- `src/middleware.ts` - Route-level authentication
- Multiple OAuth providers + email/password

### **Database Schema** (Prisma)
- **User** - Account management with roles
- **Studio** - Studio profiles with verification
- **Review** - Review system with moderation
- **Message** - Private messaging system
- **Subscription** - Payment tracking
- **Session/Account** - NextAuth.js integration

---

## 🎯 Key Business Logic

### **Authentication-First Approach**
1. **Public**: Only marketing content visible
2. **Registration**: Free account creation
3. **Studio Creation**: Requires role upgrade (payment)
4. **All Interactions**: Authentication required

### **User Role Hierarchy**
1. **USER** (Default)
   - Browse studios
   - Leave reviews
   - Send messages
   - Cannot create studios

2. **STUDIO_OWNER** (Paid Upgrade)
   - All USER permissions
   - Create/manage studios
   - Receive bookings/messages

3. **ADMIN** (System)
   - All permissions
   - User management
   - Content moderation
   - System administration

### **Revenue Model**
- **Free Registration**: Basic browsing access
- **Paid Studio Creation**: Role upgrade required
- **Premium Features**: Enhanced studio listings
- **Subscription Management**: Stripe/PayPal integration

---

## 🔄 User Journey Flows

### **New Visitor Journey**
```
Homepage (Hero) → Sign Up → Email Verification → Dashboard → Browse Studios
```

### **Studio Owner Journey**
```
Sign Up → Dashboard → Upgrade Role (Pay) → Create Studio → Admin Approval → Studio Live
```

### **User Interaction Journey**
```
Browse Studios → View Profile → Leave Review/Message → Manage Connections
```

---

## 📱 Technical Architecture

### **Frontend**
- **Next.js 15** - App Router with React Server Components
- **React 19** - Latest React features
- **TypeScript** - Full type safety
- **Tailwind CSS** - Modern styling
- **Lucide Icons** - Consistent iconography

### **Backend**
- **Next.js API Routes** - Serverless functions
- **NextAuth.js** - Authentication system
- **Prisma ORM** - Database management
- **PostgreSQL** - Modern database
- **Resend** - Email service

### **Third-Party Integrations**
- **Stripe** - Primary payment processor
- **PayPal** - Alternative payments
- **Google Maps** - Location services
- **Cloudinary** - Image management
- **Sentry** - Error tracking

---

## 🎨 Key Design Patterns

### **Authentication-Required Model**
- **Gated Content**: All functionality requires login
- **Free Registration**: Low barrier to entry
- **Role-Based Access**: Hierarchical permissions
- **Progressive Enhancement**: Features unlock with roles

### **Modern SaaS Approach**
- **Dashboard-Centric**: Central hub for all activities
- **API-First**: RESTful endpoints for all operations
- **Component-Based**: Reusable UI components
- **Real-Time Features**: Modern user expectations

### **Premium Business Model**
- **Freemium**: Basic access free
- **Pay-to-Create**: Studio creation requires upgrade
- **Subscription Management**: Ongoing revenue
- **Feature Tiers**: Premium enhancements

---

## 🔒 Security & Compliance

### **Authentication Security**
- **NextAuth.js**: Industry-standard authentication
- **OAuth Integration**: Secure third-party login
- **Session Management**: JWT-based sessions
- **Route Protection**: Server-side guards

### **Data Protection**
- **GDPR Compliance**: Data export/deletion
- **Role-Based Access**: Granular permissions
- **API Security**: Authentication required
- **Input Validation**: Zod schema validation

### **Payment Security**
- **Stripe Integration**: PCI compliant
- **Webhook Verification**: Secure payment processing
- **Subscription Management**: Automated billing
- **Refund System**: Admin-managed refunds

---

## 📊 Key Differences from Old Site

| Aspect | Old Site | New Site |
|--------|----------|----------|
| **Public Access** | ✅ Full browsing | ❌ Auth required |
| **Registration** | 💰 Paid | ✅ Free |
| **Studio Creation** | 💰 Paid registration | 💰 Role upgrade |
| **Technology** | PHP/MySQL | Next.js/PostgreSQL |
| **Authentication** | Basic sessions | NextAuth.js + OAuth |
| **Business Model** | Pay-to-participate | Freemium + role upgrades |
| **User Experience** | Public discovery | Member-centric |

---

This roadmap shows the new site operates on a **"Register Free, Pay to Create"** model where authentication is required for all functionality, but registration is free. The focus shifted from public discovery to authenticated member engagement with monetization through role upgrades and premium features.
