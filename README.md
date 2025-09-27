# VoiceoverStudioFinder

A comprehensive Next.js platform connecting voiceover professionals with clients, featuring advanced studio search, booking, and professional networking capabilities.

## 🌐 Live Site
- **Production**: https://vostudiofinder.vercel.app
- **Development**: http://localhost:3000

---

## 🎉 **Latest Development Session Summary (September 27, 2025)**

### **What Was Accomplished Today:**

#### ✅ **Admin Site Integration & Management System**
- **Complete Admin Dashboard** with role-based access control and authentication
- **Studio Management Interface** with table view, search, and filtering capabilities
- **Advanced Studio Editor Modal** with tabbed interface matching the old site's functionality
- **Batch Processing System** with checkbox selection and bulk operations (activate, deactivate, delete, export)
- **Admin API Endpoints** for studio CRUD operations and bulk actions
- **Security Implementation** with NextAuth.js middleware and admin-only route protection

#### ✅ **UI/UX Enhancements & Professional Polish**
- **Modal Header Optimization** with reduced padding and larger close button (4x size)
- **Button Color Standardization** - Edit buttons blue, View buttons white, Delete buttons red
- **Left Padding Addition** to studio count text for better visual alignment
- **CSS Override Resolution** using inline styles to bypass global CSS conflicts
- **Responsive Design** improvements across all admin interfaces

#### ✅ **Database & Backend Integration**
- **Prisma ORM Integration** with proper Decimal field serialization for client components
- **Admin User Seeding** with `admin@mpdee.co.uk` credentials
- **Database Health Checks** with `/api/health` endpoint for monitoring
- **Environment Configuration** with comprehensive setup documentation

#### ✅ **Testing & Quality Assurance**
- **Playwright Test Suite** for admin authentication, API endpoints, and functionality validation
- **Cross-browser Testing** for admin interface compatibility
- **Performance Testing** for bulk operations and large dataset handling
- **Security Testing** for CSRF protection and API authorization

#### ✅ **Development Workflow & Deployment**
- **Build Process Optimization** with Next.js configuration updates
- **Docker Configuration** with health checks and service dependencies
- **Vercel Deployment** configuration with admin route handling
- **Environment Setup** scripts and documentation

---

## 🛠 **Technology Stack**

### **Core Framework**
- **Next.js 15.5.2** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling with custom theme
- **Turbopack** - Fast bundler for development and production

### **Database & ORM**
- **PostgreSQL** - Primary database (Vercel Postgres)
- **Prisma 6.15.0** - Database ORM with type generation
- **MySQL** - Legacy database for data migration

### **Authentication & Security**
- **NextAuth.js 4.24.11** - Complete authentication solution
- **Google OAuth** - Social login integration
- **bcryptjs** - Password hashing
- **JWT** - Session management
- **Role-based Access Control** - Admin, Studio Owner, User roles

### **File Storage & CDN**
- **Cloudinary** - Image upload, storage, and optimization
- **Next.js Image** - Optimized image delivery

### **Payment & Subscription**
- **Stripe API** - Payment processing and subscription management
- **PayPal Integration** - Alternative payment method
- **Membership Management** - Tiered access control

### **Maps & Location Services**
- **Google Maps API** - Interactive maps and location services
- **Google Places API** - Location autocomplete and search
- **Geolocation Services** - GPS coordinate handling

### **Admin & Management**
- **Admin Dashboard** - Comprehensive management interface
- **Bulk Operations** - Batch processing for studio management
- **CSV Export** - Data export functionality
- **Real-time Updates** - Live data refresh and synchronization

### **UI & Components**
- **Lucide React** - Icon library with Camera, Shield, MapPin, etc.
- **Custom UI Components** - Button, Input, FileUpload, FixedDynamicGallery, etc.
- **Dynamic Gallery System** - Rightmove-style adaptive layouts (2x2/2x1)
- **Responsive Design** - Mobile-first approach with Facebook-style profiles
- **Tailwind Gradients** - Purple Heritage theme with gradient effects
- **Persistent Navigation** - Fixed header with scroll-responsive design
- **Textured Backgrounds** - Consistent visual theming across all sections
- **Modal Systems** - Advanced studio editing with tabbed interfaces

### **Development Tools**
- **ESLint & Prettier** - Code quality and formatting
- **Jest & Playwright** - Testing framework and E2E testing
- **Git** - Version control
- **Vercel** - Deployment platform
- **Docker** - Containerization and deployment

---

## 📁 **Current Site Structure**

```
vostudiofinder/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── [username]/               # Username-based routing (e.g., /VoiceoverGuy)
│   │   ├── admin/                    # Admin dashboard and management
│   │   │   ├── studios/              # Studio management interface
│   │   │   ├── analytics/            # Analytics dashboard
│   │   │   ├── faq/                  # FAQ management
│   │   │   └── layout.tsx            # Admin layout with authentication
│   │   ├── about/                    # About page
│   │   ├── auth/                     # Authentication routes
│   │   │   ├── membership/           # Membership payment flow
│   │   │   ├── signin/               # Sign in page
│   │   │   └── signup/               # Sign up page
│   │   ├── contact/                  # Contact page
│   │   ├── cookies/                  # Cookie policy
│   │   ├── help/                     # Help documentation
│   │   ├── privacy/                  # Privacy policy
│   │   ├── terms/                    # Terms of service
│   │   ├── api/                      # API routes
│   │   │   ├── admin/                # Admin endpoints
│   │   │   │   ├── bulk/             # Bulk operations API
│   │   │   │   ├── studios/          # Studio management API
│   │   │   │   └── dashboard/        # Dashboard data API
│   │   │   ├── auth/                 # Auth endpoints
│   │   │   ├── stripe/               # Stripe payment integration
│   │   │   ├── studios/              # Studio CRUD & search
│   │   │   ├── user/                 # User management
│   │   │   ├── upload/               # File upload
│   │   │   └── health/               # Health check endpoint
│   │   ├── dashboard/                # User dashboard
│   │   ├── profile/                  # User profile management
│   │   ├── studio/                   # Studio pages
│   │   │   ├── [id]/                 # Individual studio pages
│   │   │   └── create/               # Studio creation
│   │   └── studios/                  # Studio listings & search with map
│   ├── components/                   # React components
│   │   ├── admin/                    # Admin components
│   │   │   ├── AdminBulkOperations.tsx # Bulk processing interface
│   │   │   ├── AdminDashboard.tsx    # Main admin dashboard
│   │   │   ├── AdminGuard.tsx        # Route protection
│   │   │   └── EditStudioModal.tsx   # Studio editing modal
│   │   ├── auth/                     # Authentication forms & membership
│   │   ├── home/                     # Homepage components
│   │   ├── maps/                     # Google Maps integration
│   │   ├── navigation/               # Persistent navbar
│   │   ├── search/                   # Search functionality & autocomplete
│   │   ├── studio/                   # Studio-related components
│   │   └── ui/                       # Reusable UI components
│   └── lib/                          # Utility libraries
│       ├── auth.ts                   # Authentication config
│       ├── prisma.ts                 # Database connection
│       ├── cloudinary.ts             # Image upload service
│       ├── maps.ts                   # Google Maps utilities
│       ├── utils/                    # Utility functions
│       │   └── text.ts               # Text cleaning utilities
│       └── validations/              # Zod schemas
├── tests/                            # Test suites
│   ├── admin/                        # Admin functionality tests
│   ├── admin-auth-playwright.spec.ts # Authentication tests
│   ├── admin-api-playwright.spec.ts  # API endpoint tests
│   └── admin-performance-test.spec.ts # Performance tests
├── scripts/                          # Migration and utility scripts
│   ├── migration/                    # Data migration scripts
│   ├── seed-database.ts              # Database seeding
│   ├── deploy.sh                     # Deployment script
│   └── health-check.sh               # Health monitoring
├── prisma/                           # Database schema
│   └── schema.prisma                 # Prisma schema definition
├── public/                           # Static assets
│   ├── bakground-images/             # Textured backgrounds
│   └── bottom-banner.jpg             # Hero section background
├── docker-compose.yml                # Docker configuration
├── Dockerfile                        # Docker image definition
├── vercel.json                       # Vercel deployment config
└── package.json                      # Dependencies
```

---

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL database
- Cloudinary account
- Google OAuth credentials

### **Installation**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mattduff36/vostudiofinder.git
   cd vostudiofinder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Google OAuth
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # Google Maps API
   GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
   
   # Stripe Payment Processing
   STRIPE_SECRET_KEY="your-stripe-secret-key"
   STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   
   # Admin Configuration
   AUTH_USERNAME="admin"
   AUTH_PASSWORD="your-admin-password"
   JWT_SECRET="your-jwt-secret"
   
   # Email Service (Optional - currently disabled)
   RESEND_API_KEY="your-resend-api-key"
   ```

4. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📊 **Database Schema**

### **Key Models:**
- **User** - User accounts with authentication and roles
- **Studio** - Studio profiles with detailed information
- **StudioImage** - Image gallery for studios
- **StudioService** - Services offered by studios
- **Review** - User reviews and ratings
- **Message** - Internal messaging system
- **Faq** - Frequently asked questions for admin management

### **Admin Features:**
- **Role-based Access Control** - Admin, Studio Owner, User roles
- **Bulk Operations** - Batch processing for studio management
- **Data Export** - CSV export functionality
- **Health Monitoring** - Database and API health checks

---

## 🔧 **Development Tools Used Today**

### **Admin Development:**
- **NextAuth.js** for authentication and session management
- **Prisma Client** for database operations and type safety
- **Playwright** for end-to-end testing of admin functionality
- **Jest** for unit testing of components and utilities

### **UI/UX Development:**
- **Tailwind CSS** for responsive design and styling
- **React Hooks** for state management and component lifecycle
- **TypeScript** for type safety and better development experience
- **Lucide React** for consistent iconography

### **Build & Deployment:**
- **Next.js build system** with Turbopack for fast development
- **TypeScript compiler** for type checking and error prevention
- **ESLint** for code quality and consistency
- **Vercel** for seamless deployment and hosting

### **Testing & Quality:**
- **Playwright** for cross-browser testing and user interaction simulation
- **Jest** for unit testing and component testing
- **Manual testing** for UI/UX validation and user experience verification

---

## 📈 **Current Platform Status**

### **✅ Completed Features:**
- **Authentication & Membership**: Google OAuth, email/password, Stripe subscription system
- **Studio Management**: Profile creation, dynamic image galleries, equipment listings, service management
- **Admin Dashboard**: Complete management interface with role-based access control
- **Bulk Operations**: Checkbox selection, batch processing, CSV export functionality
- **Advanced Profile Pages**: Rightmove-style galleries, Facebook-style layouts, textured backgrounds
- **Dynamic Gallery System**: 2x2/2x1 adaptive layouts, lightbox functionality, image optimization
- **Advanced Search**: Location-based search with Google Places autocomplete and map view
- **User Experience**: Purple Heritage theme, persistent navigation, responsive design
- **Professional Routing**: Clean username-based URLs (e.g., `/VoiceoverGuy`)
- **Payment Processing**: Stripe integration for membership subscriptions
- **Maps Integration**: Interactive Google Maps with studio locations and markers
- **Content Management**: Static pages, textured backgrounds, professional layouts
- **Data Quality**: Cleaned descriptions, optimized images, comprehensive profiles
- **Public Access**: Browse studios without login, membership required only for listing
- **Admin Management**: Studio CRUD operations, bulk actions, data export, health monitoring

### **📊 Live Data:**
- **51+ Professional Users** with authentic profiles and clean usernames
- **50+ Studio Profiles** with real-world information and professional images
- **Interactive Map Locations** with GPS coordinates and clickable markers
- **Professional Equipment Lists** (Neumann U87, TLM 103, Apollo X4/X6, etc.)
- **Connection Services** (ISDN, Source Connect, Zoom, Teams, Session Link Pro)
- **Membership System** with £25/year studio owner subscriptions
- **Comprehensive Static Content** (About, Contact, Privacy, Terms, Help pages)
- **Admin Management System** with full CRUD operations and bulk processing

---

## 🎯 **Suggested Next Development Steps**

### **Phase 1: Enhanced Admin Features (Priority: High)**
1. **Advanced Analytics Dashboard**
   - User engagement metrics
   - Studio performance analytics
   - Revenue tracking and reporting
   - Geographic distribution analysis

2. **Content Management System**
   - FAQ management interface
   - Static page content editor
   - Image gallery management
   - SEO optimization tools

3. **User Management**
   - User role management
   - Account verification system
   - Communication tools
   - Support ticket system

### **Phase 2: Enhanced User Experience (Priority: High)**
1. **Advanced Search Filters**
   - Price range filtering
   - Equipment-based search
   - Language/accent specialization
   - Availability calendar integration

2. **Booking System**
   - Real-time availability checking
   - Integrated calendar booking
   - Automated confirmation emails
   - Payment integration (Stripe/PayPal)

3. **Review & Rating System**
   - Client feedback collection
   - Star rating system
   - Review moderation tools
   - Professional testimonials

### **Phase 3: Professional Tools (Priority: Medium)**
1. **Audio Sample Management**
   - Upload and organize voice samples
   - Audio player integration
   - Sample categorization
   - Quality optimization

2. **Project Management**
   - Job posting system
   - Project timeline tracking
   - File sharing capabilities
   - Communication tools

3. **Analytics Dashboard**
   - Profile view statistics
   - Booking analytics
   - Revenue tracking
   - Performance insights

### **Phase 4: Platform Expansion (Priority: Medium)**
1. **Mobile Application**
   - React Native development
   - Push notifications
   - Offline capabilities
   - Mobile-optimized booking

2. **Advanced Networking**
   - Professional connections
   - Industry events calendar
   - Collaboration tools
   - Mentorship programs

3. **AI-Powered Features**
   - Voice matching algorithms
   - Automated transcription
   - Smart recommendations
   - Quality assessment tools

---

## 🔍 **Technical Debt & Improvements**

### **Code Quality:**
- Reduce ESLint warnings (console statements, any types)
- Implement proper TypeScript interfaces
- Add comprehensive error boundaries
- Improve loading states and UX

### **Performance:**
- Implement React Query for data fetching
- Add Redis caching layer
- Optimize image loading strategies
- Implement lazy loading for components

### **Testing:**
- Unit tests with Jest
- Integration tests with Playwright
- API endpoint testing
- Performance testing

### **Security:**
- Input validation improvements
- Rate limiting implementation
- Security audit and penetration testing
- GDPR compliance enhancements

---

## 🚀 **Deployment**

### **Production Environment:**
- **Platform**: Vercel
- **Database**: Vercel Postgres
- **CDN**: Cloudinary
- **Domain**: https://vostudiofinder.vercel.app

### **Build Process:**
```bash
npm run build  # Includes Prisma generation and Next.js build
```

### **Environment Variables Required:**
- Database connections
- Authentication secrets
- Third-party API keys
- Deployment configurations

---

## 📞 **Support & Contact**

For technical support or development inquiries:
- **Repository**: https://github.com/mattduff36/vostudiofinder
- **Issues**: Use GitHub Issues for bug reports
- **Development**: Follow the contributing guidelines

---

**Last Updated**: September 27, 2025  
**Build Status**: ✅ Production Ready  
**Version**: Professional Platform v2.1 - Admin Management System with Bulk Operations
