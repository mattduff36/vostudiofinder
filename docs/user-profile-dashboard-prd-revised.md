# User Profile Management Dashboard - REVISED PRD
## Implementation Plan Based on Existing Infrastructure

**Version:** 1.1 (Revised)  
**Date:** January 11, 2025  
**Status:** ✅ Ready for Implementation

---

## 🎯 Executive Summary - What's Already Done vs What We Need to Build

### ✅ Already Implemented (Existing Infrastructure)

**Authentication & Authorization:**
- ✅ NextAuth.js fully configured
- ✅ Session management working
- ✅ `requireAuth()` guard function
- ✅ Role-based access control
- ✅ Middleware for route protection

**Database & Backend:**
- ✅ PostgreSQL database with Prisma ORM
- ✅ All tables exist (users, user_profiles, studios, etc.)
- ✅ Database relationships configured
- ✅ Prisma client generated and working

**Existing API Endpoints:**
- ✅ `/api/user/connections` - Manage user connections
- ✅ `/api/user/notifications` - Handle notifications
- ✅ `/api/user/invoices` - Billing/invoices
- ✅ `/api/user/saved-searches` - Search management
- ✅ `/api/user/data-export` - GDPR data export
- ✅ `/api/user/upgrade-role` - Role upgrades

**Existing Pages:**
- ✅ `/dashboard` page exists with authentication
- ✅ `/profile` page exists
- ✅ Profile display component (`ModernStudioProfileV3`)
- ✅ Server-side data fetching working

**Existing Components:**
- ✅ `UserDashboard` component (basic dashboard view)
- ✅ UI components: `Button`, `Input`, `FileUpload`
- ✅ Admin `EditStudioModal` (reference pattern to follow)

**External Integrations:**
- ✅ Cloudinary for image storage
- ✅ Stripe for payments
- ✅ Google Maps integration
- ✅ Email service configured

---

## 🚧 What We Actually Need to Build

### Phase 1: Profile Management API (1-2 days)

**NEW API Endpoints Needed:**

1. **Enhanced Profile Fetch**
   - Endpoint: `GET /api/user/profile`
   - Purpose: Fetch complete profile for editing (enhance existing if it exists)
   - Include: user, user_profiles, studio, studio_types, services, images

2. **Profile Update**
   - Endpoint: `PUT /api/user/profile`
   - Purpose: Update profile data (partial updates supported)
   - Validation with Zod
   - Handle studio_types and services updates

3. **Image Management**
   - `POST /api/user/profile/images` - Upload new image
   - `PUT /api/user/profile/images/reorder` - Reorder images
   - `PUT /api/user/profile/images/:id` - Update alt text
   - `DELETE /api/user/profile/images/:id` - Delete image

---

### Phase 2: Dashboard UI Transformation (3-4 days)

**Transform Existing Dashboard:**

Currently, `/dashboard` shows:
- Basic stats
- Studios list
- Reviews
- Messages
- Connections

**NEW: Add Profile Management Tabs:**
```
Current Dashboard (Overview) ← Keep this
     +
New Tabs:
  - Edit Profile
  - Manage Images
  - Settings
```

**Specific Components to Create:**

1. **`DashboardTabs` Component**
   ```tsx
   <DashboardTabs>
     <Tab>Overview</Tab>        ← Existing UserDashboard
     <Tab>Edit Profile</Tab>    ← NEW
     <Tab>Manage Images</Tab>   ← NEW
     <Tab>Settings</Tab>        ← NEW
   </DashboardTabs>
   ```

2. **`ProfileEditForm` Component** (NEW)
   - Based on admin `EditStudioModal` pattern
   - Sections: Basic Info, Contact, Location, Rates, Social, Connections
   - Real-time validation
   - Save/Cancel actions

3. **`ImageGalleryManager` Component** (NEW)
   - Grid view of images
   - Drag-and-drop reordering
   - Upload interface
   - Edit/delete actions

4. **Enhanced UI Components** (extend existing)
   - `Textarea` (new, based on existing Input)
   - `Toggle` (new, for boolean settings)
   - `Select` (new, for dropdowns)
   - `Checkbox` (new, for multi-select)

---

### Phase 3: Form Logic & Validation (1-2 days)

**Create Validation Schemas:**
```
src/lib/validations/profile.ts
  - profileUpdateSchema (Zod)
  - usernameSchema
  - urlSchema
  - rateSchema
  - imageUploadSchema
```

**Form State Management:**
- Use React Hook Form
- Zod resolver for validation
- Optimistic UI updates
- Error handling

---

## 📋 Revised Implementation Tasks

### Task Group 1: API Layer (Priority: High)

**T1.1: Create/Enhance Profile API**
```typescript
// src/app/api/user/profile/route.ts

export async function GET() {
  // Fetch user + profile + studio + types + services + images
  // Return comprehensive profile data
}

export async function PUT() {
  // Validate request body with Zod
  // Update users table (if needed)
  // Update user_profiles table
  // Update studios table
  // Update studio_types (delete + recreate)
  // Update studio_services (delete + recreate)
  // Return updated profile
}
```

**T1.2: Create Image Management APIs**
```typescript
// src/app/api/user/profile/images/route.ts
export async function POST() {
  // Upload to Cloudinary
  // Create studio_images record
  // Return image data
}

// src/app/api/user/profile/images/reorder/route.ts
export async function PUT() {
  // Update sort_order for multiple images
}

// src/app/api/user/profile/images/[id]/route.ts
export async function PUT() {
  // Update alt_text
}

export async function DELETE() {
  // Delete from Cloudinary
  // Delete from database
}
```

**T1.3: Create Validation Schemas**
```typescript
// src/lib/validations/profile.ts

export const profileUpdateSchema = z.object({
  user: z.object({
    display_name: z.string().min(2).max(50).optional(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  }).optional(),
  profile: z.object({
    phone: z.string().optional(),
    about: z.string().optional(),
    short_about: z.string().optional(),
    // ... all user_profiles fields
  }).optional(),
  studio: z.object({
    name: z.string().min(2).max(30).optional(),
    description: z.string().optional(),
    // ... all studio fields
  }).optional(),
  studio_types: z.array(z.enum(['HOME', 'RECORDING', ...])).optional(),
  services: z.array(z.enum([...])).optional(),
});
```

---

### Task Group 2: Dashboard UI Components (Priority: High)

**T2.1: Create Dashboard Layout with Tabs**
```typescript
// src/components/dashboard/DashboardLayout.tsx

export function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <DashboardTabs />
        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
```

**T2.2: Create Tabbed Interface**
```typescript
// src/components/dashboard/DashboardTabs.tsx

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="bg-white border-b">
      <nav className="flex space-x-8">
        <Tab id="overview" icon={Home} label="Overview" />
        <Tab id="edit-profile" icon={Edit} label="Edit Profile" />
        <Tab id="images" icon={Image} label="Images" />
        <Tab id="settings" icon={Settings} label="Settings" />
      </nav>
    </div>
  );
}
```

**T2.3: Create Profile Edit Form**
```typescript
// src/components/dashboard/ProfileEditForm.tsx

export function ProfileEditForm({ initialData }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: initialData,
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Accordion or tabs for different sections */}
      <BasicInfoSection />
      <ContactSection />
      <LocationSection />
      <RatesSection />
      <SocialMediaSection />
      <ConnectionsSection />
      
      <div className="flex justify-end gap-4 mt-6">
        <Button type="button" variant="secondary">Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}
```

**T2.4: Create Image Gallery Manager**
```typescript
// src/components/dashboard/ImageGalleryManager.tsx

export function ImageGalleryManager({ studioId, initialImages }) {
  const [images, setImages] = useState(initialImages);
  
  return (
    <div>
      <ImageUploadZone onUpload={handleUpload} />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            sortOrder={index}
            onReorder={handleReorder}
            onEdit={handleEditAltText}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### Task Group 3: Additional UI Components (Priority: Medium)

**T3.1: Create Missing Form Components**
```typescript
// src/components/ui/Textarea.tsx
export function Textarea({ label, error, ...props }) { }

// src/components/ui/Toggle.tsx
export function Toggle({ label, checked, onChange }) { }

// src/components/ui/Checkbox.tsx
export function Checkbox({ label, checked, onChange }) { }

// src/components/ui/Select.tsx
export function Select({ label, options, value, onChange }) { }
```

**T3.2: Create Toast Notification System**
```typescript
// src/components/ui/Toast.tsx
export function Toast({ type, message, onClose }) { }

// src/lib/utils/toast.ts
export const toast = {
  success: (message) => {},
  error: (message) => {},
  info: (message) => {},
};
```

---

### Task Group 4: Integration & Polish (Priority: Medium)

**T4.1: Update Dashboard Page**
```typescript
// src/app/dashboard/page.tsx (UPDATE)

export default async function DashboardPage() {
  const session = await requireAuth();
  
  // Fetch existing data (already done)
  const dashboardData = { ... };
  
  // Add profile data for editing
  const profileData = await fetchCompleteProfile(session.user.id);
  
  return (
    <DashboardLayout>
      <DashboardContent 
        dashboardData={dashboardData}
        profileData={profileData}
      />
    </DashboardLayout>
  );
}
```

**T4.2: Mobile Responsiveness**
- Test all new components on mobile
- Adjust spacing, sizing
- Hamburger menu for tabs on mobile

**T4.3: Loading States**
- Skeleton loaders for profile data
- Button loading spinners
- Upload progress indicators

---

## 🎨 Design Pattern: Follow Admin Modal

**Key Insight:** The admin `EditStudioModal` component already has the perfect pattern.

**What to Replicate:**
1. ✅ Tabbed interface for organizing fields
2. ✅ Field groupings (Basic, Contact, Location, etc.)
3. ✅ Visibility toggles pattern
4. ✅ Connection method checkboxes
5. ✅ Character counters
6. ✅ Validation error display
7. ✅ Save button states

**What to Change:**
1. ❌ Not a modal (full page dashboard instead)
2. ❌ Not admin-only (user's own profile)
3. ❌ Add image management (admin modal doesn't have this)
4. ✅ Keep same field structure and validation

---

## 📱 Simplified User Flow

```
User logs in
    ↓
Goes to /dashboard
    ↓
Sees tabs: [Overview] [Edit Profile] [Images] [Settings]
    ↓
Clicks "Edit Profile"
    ↓
Sees form with sections (like admin modal)
    ↓
Edits fields
    ↓
Clicks "Save Changes"
    ↓
API validates and updates
    ↓
Success toast shown
    ↓
Can click "Preview Profile" to see public view
```

---

## ⏱️ Realistic Timeline

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| **Phase 1: API** | Profile GET/PUT + Image APIs + Validation | 2 days | 🟡 In Progress |
| **Phase 2: Core UI** | Dashboard tabs + Profile form + Image manager | 3 days | ⏳ Not Started |
| **Phase 3: Components** | Textarea, Toggle, Checkbox, Select | 1 day | ⏳ Not Started |
| **Phase 4: Polish** | Mobile, loading states, error handling | 1 day | ⏳ Not Started |
| **Phase 5: Testing** | E2E tests, bug fixes, refinements | 1 day | ⏳ Not Started |

**Total:** ~8 working days (1.5-2 weeks)

---

## 🚀 Immediate Next Steps (What to Build Now)

### Step 1: Complete API Layer (Today)
- [ ] Finish `GET /api/user/profile`
- [ ] Create `PUT /api/user/profile`
- [ ] Create image management endpoints
- [ ] Create Zod validation schemas
- [ ] Test endpoints with Postman/curl

### Step 2: Dashboard Structure (Tomorrow)
- [ ] Create `DashboardLayout` component
- [ ] Create `DashboardTabs` component
- [ ] Update `/dashboard` page to use new layout
- [ ] Test tab switching

### Step 3: Profile Edit Form (Day 3-4)
- [ ] Create `ProfileEditForm` component
- [ ] Create form sections (Basic, Contact, etc.)
- [ ] Integrate React Hook Form
- [ ] Connect to API
- [ ] Test save functionality

### Step 4: Image Management (Day 5)
- [ ] Create `ImageGalleryManager` component
- [ ] Implement upload functionality
- [ ] Implement reordering (drag-drop)
- [ ] Implement edit/delete

### Step 5: Polish & Test (Day 6-7)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Mobile responsiveness
- [ ] Test all functionality
- [ ] Fix bugs

---

## 💡 Key Implementation Notes

1. **Don't Reinvent the Wheel:**
   - Use existing `Button`, `Input` components
   - Follow existing component patterns
   - Copy structure from `EditStudioModal`

2. **Leverage Existing Infrastructure:**
   - Auth is done (`requireAuth()`)
   - Database is ready (use Prisma)
   - Cloudinary is configured (use existing)

3. **Keep It Simple:**
   - Start with basic functionality
   - Add polish later
   - Test incrementally

4. **Mobile First:**
   - Design for mobile from the start
   - Test on different screen sizes
   - Use Tailwind responsive classes

---

## ✅ Success Criteria (Simplified)

**Must Have:**
- ✅ User can edit all profile fields
- ✅ User can upload/reorder/delete images
- ✅ Changes save successfully to database
- ✅ Validation prevents invalid data
- ✅ Works on mobile and desktop

**Nice to Have:**
- ⭐ Auto-save drafts
- ⭐ Profile completion percentage
- ⭐ Preview profile before saving
- ⭐ Keyboard shortcuts (Ctrl+S to save)

---

**Let's build this! Starting with Phase 1 API endpoints...**

