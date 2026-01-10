# Product Requirements Document: Admin Profile Editing Improvements

## 1. Overview

### 1.1 Purpose
Enhance the admin studio editing modal (`/admin/studios`) to provide comprehensive control over all profile page elements, creating a seamless connection between the admin interface and the public-facing profile pages.

### 1.2 Goals
- Provide intuitive admin controls for social media links displayed on profile pages
- Re-implement and properly link the "Connections" section (removed from profile page)
- Ensure image management is properly integrated with Cloudinary
- Create a unified editing experience that mirrors what's displayed on profile pages

### 1.3 Current State
- Social media links are stored in `user_profiles` table but not editable in admin modal
- Connections feature was removed from profile page but database fields still exist
- Image management exists but connection to admin modal needs verification
- Admin cannot see real-time preview of changes on profile page

---

## 2. Technical Discovery

### 2.1 Database Schema
**Social Media URLs** (in `user_profiles` table):
- `facebook_url` - Facebook profile URL
- `twitter_url` - Twitter profile URL  
- `linkedin_url` - LinkedIn profile URL
- `instagram_url` - Instagram profile URL
- `youtube_url` - YouTube channel URL
- `vimeo_url` - Vimeo profile URL
- `soundcloud_url` - SoundCloud profile URL

**Connection Types** (in `user_profiles` table):
- `connection1` (VARCHAR) - Source Connect
- `connection2` (VARCHAR) - Source Connect Now
- `connection3` (VARCHAR) - Phone Patch
- `connection4` (VARCHAR) - Session Link Pro
- `connection5` (VARCHAR) - Zoom or Teams
- `connection6` (VARCHAR) - Cleanfeed
- `connection7` (VARCHAR) - Riverside (needs to be added)
- `connection8` (VARCHAR) - Google Hangouts (needs to be added)

**Images** (in `studio_images` table):
- `id` - Unique identifier
- `studio_id` - Foreign key to studios
- `image_url` - Cloudinary URL
- `alt_text` - Accessibility text
- `sort_order` - Display order (0-based)

### 2.2 Current Implementation
- **Profile Display**: `ModernStudioProfileV3.tsx` displays social links from `studio.owner.profile`
- **Cloudinary**: Fully configured with credentials in `.env.local`
- **Upload API**: `/api/upload/image` handles Cloudinary uploads
- **Admin Modal**: `EditStudioModal.tsx` currently doesn't have social media or connections fields

---

## 3. Feature Requirements

### 3.1 Social Media Links Management

#### 3.1.1 Admin Modal UI
**Location**: Add new tab "Social Media" in `EditStudioModal.tsx`

**Fields to Add**:
```typescript
- Facebook URL (text input, URL validation)
- Twitter URL (text input, URL validation)
- LinkedIn URL (text input, URL validation)
- Instagram URL (text input, URL validation)
- YouTube URL (text input, URL validation)
- Vimeo URL (text input, URL validation)
- SoundCloud URL (text input, URL validation)
```

**UI Requirements**:
- Each field should have platform icon for quick identification
- Validate URLs start with `http://` or `https://`
- Show live preview icon that opens URL in new tab
- Clear button to remove URL
- Auto-detect and format common URL patterns (e.g., add https:// if missing)

#### 3.1.2 Profile Page Display
**Location**: `ModernStudioProfileV3.tsx` - "Find us on socials" section

**Current Implementation**: ✅ Already displays social links correctly
**Requirements**:
- Section only shows if at least one social link exists
- Icons should match the platform
- Links open in new tab with `rel="noopener noreferrer"`
- Current styling is correct (gray badges with hover effects)

#### 3.1.3 API Integration
**Endpoint to Update**: `/api/admin/studios/[id]` PUT method

**Required Changes**:
```typescript
// Add to request body
{
  profile: {
    facebookUrl?: string,
    twitterUrl?: string,
    linkedinUrl?: string,
    instagramUrl?: string,
    youtubeUrl?: string,
    vimeoUrl?: string,
    soundcloudUrl?: string
  }
}
```

---

### 3.2 Connections Management

#### 3.2.1 Admin Modal UI
**Location**: Add new tab "Connections" in `EditStudioModal.tsx`

**Fields to Add** (checkboxes with toggle switches):
```typescript
- Source Connect (boolean)
- Source Connect Now (boolean)
- Phone Patch (boolean)
- Session Link Pro (boolean)
- Zoom or Teams (boolean)
- Cleanfeed (boolean)
- Riverside (boolean)
- Google Hangouts (boolean)
```

**UI Requirements**:
- Toggle switches (on/off) for each connection type
- Visual icon for each connection type
- Grouped in a clean grid layout (2 columns on desktop, 1 on mobile)
- Help text explaining what each connection type means
- "Select All" / "Deselect All" buttons for convenience

#### 3.2.2 Profile Page Display
**Location**: Re-add "Connections" section to `ModernStudioProfileV3.tsx`

**Design Requirements** (based on user's image):
```
┌─────────────────────────────────────┐
│ Connections                         │
│                                     │
│ 🔗 Source Connect                   │
│ 🔗 Source Connect Now               │
│ 📞 Phone patch                      │
│ 🎤 Session Link Pro                 │
│ 💻 Zoom or Teams                    │
│ 🎵 Cleanfeed                        │
│ 🎬 Riverside                        │
│ 📹 Google Hangouts                  │
└─────────────────────────────────────┘
```

**Styling**:
- White background card with border (matching other sidebar cards)
- Gray checkmark/icon next to each active connection
- Only show connections that are enabled (connection value = '1' or true)
- Hide entire section if no connections are enabled
- Use same padding as other sidebar cards (`px-6 py-3`)

#### 3.2.3 Database Schema Updates
**Required Migration**:
```sql
-- Add missing connection fields to user_profiles table
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS connection7 VARCHAR(10),
  ADD COLUMN IF NOT EXISTS connection8 VARCHAR(10);

-- Update column types if needed (ensure they can store '0' or '1')
```

**Storage Format**: Store as string '1' (enabled) or '0' (disabled) for consistency with existing fields

#### 3.2.4 API Integration
**Endpoint to Update**: `/api/admin/studios/[id]` PUT method

**Required Changes**:
```typescript
// Add to request body
{
  profile: {
    connection1?: string, // '0' or '1'
    connection2?: string,
    connection3?: string,
    connection4?: string,
    connection5?: string,
    connection6?: string,
    connection7?: string, // new
    connection8?: string  // new
  }
}
```

---

### 3.3 Image Management

#### 3.3.1 Current State Verification
**Tasks**:
1. ✅ Verify Cloudinary integration is working
2. ✅ Verify images on profile pages are served from Cloudinary
3. ✅ Check if admin modal has image upload/management
4. Add image management tab if missing

#### 3.3.2 Admin Modal UI
**Location**: Add/verify "Images" tab in `EditStudioModal.tsx`

**Features Required**:
- Upload new images (drag & drop + file picker)
- View all current studio images
- Reorder images (drag & drop)
- Edit alt text for accessibility
- Delete images
- Set primary/hero image
- Preview images before upload
- Progress indicator during upload
- Image optimization feedback (size, dimensions)

**Technical Requirements**:
- Max 10 images per studio
- Max 5MB per image
- Supported formats: JPEG, PNG, WebP
- Auto-optimize on upload via Cloudinary
- Store in folder: `voiceover-studios/{userId}/`

#### 3.3.3 Profile Page Display
**Location**: `ModernStudioProfileV3.tsx` - Hero image gallery

**Current Implementation**: ✅ Already displays images correctly with swap functionality
**Verification Needed**:
- Ensure all displayed images are from `studio_images` table
- Verify URLs are Cloudinary CDN URLs
- Check image optimization is applied

#### 3.3.4 API Integration
**Existing Endpoints**:
- ✅ `POST /api/upload/image` - Upload to Cloudinary
- ✅ `DELETE /api/upload/image` - Delete from Cloudinary

**Endpoint to Update**: `/api/admin/studios/[id]` PUT method
**Required Changes**:
```typescript
// Add support for image metadata updates
{
  images: [
    {
      id: string,
      imageUrl: string,
      altText: string,
      sortOrder: number
    }
  ]
}
```

---

## 4. UI/UX Design

### 4.1 Admin Modal Tabs
**Current Tabs**: Basic Info, Services, Types, Settings
**New Tabs to Add**:
1. **Social Media** (new)
2. **Connections** (new)
3. **Images** (new or verify existing)

### 4.2 Tab Layout
```
┌────────────────────────────────────────────────────────┐
│  Basic Info | Services | Types | Social Media |       │
│  Connections | Images | Settings                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [Tab Content Here]                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 4.3 Form Validation
- URL fields: Validate format, show error if invalid
- Connections: No validation needed (boolean toggles)
- Images: Validate file type and size before upload

### 4.4 Save Behavior
- Show loading spinner during save
- Display success message on successful save
- Display error message with details on failure
- Don't close modal automatically (let admin verify changes)
- Add "Save & View Profile" button that saves and opens profile in new tab

---

## 5. Testing Requirements

### 5.1 Unit Tests
- [ ] Social media URL validation
- [ ] Connection toggle state management
- [ ] Image upload to Cloudinary
- [ ] Image reordering logic

### 5.2 Integration Tests
- [ ] Save social media URLs and verify on profile page
- [ ] Toggle connections and verify on profile page
- [ ] Upload images and verify they appear correctly
- [ ] Delete images and verify removal
- [ ] Edit image alt text and verify accessibility

### 5.3 Manual Testing Checklist
- [ ] Open admin modal for existing studio
- [ ] Add social media URLs in all fields
- [ ] Save and verify URLs display on profile page
- [ ] Toggle all connection types on
- [ ] Verify connections section appears on profile page
- [ ] Toggle connections off, verify section hides
- [ ] Upload new studio image
- [ ] Verify image appears on profile page
- [ ] Reorder images in admin
- [ ] Verify order reflects on profile page
- [ ] Delete image in admin
- [ ] Verify image removed from profile page

---

## 6. Implementation Plan

### 6.1 Phase 1: Database Schema (Priority: HIGH)
**Tasks**:
1. Create migration to add connection7 and connection8 fields
2. Verify all social media URL fields exist in user_profiles
3. Verify studio_images table structure
4. Run migration in development

**Files to Modify**:
- `prisma/schema.prisma`
- Create new migration file

**Estimated Time**: 30 minutes

### 6.2 Phase 2: API Updates (Priority: HIGH)
**Tasks**:
1. Update `/api/admin/studios/[id]` GET to include social media URLs
2. Update `/api/admin/studios/[id]` GET to include connection fields
3. Update `/api/admin/studios/[id]` GET to include image data
4. Update `/api/admin/studios/[id]` PUT to save social media URLs
5. Update `/api/admin/studios/[id]` PUT to save connection fields
6. Update `/api/admin/studios/[id]` PUT to save image metadata
7. Add validation for URL formats
8. Add validation for image operations

**Files to Modify**:
- `src/app/api/admin/studios/[id]/route.ts`

**Estimated Time**: 2 hours

### 6.3 Phase 3: Admin Modal UI (Priority: HIGH)
**Tasks**:
1. Add "Social Media" tab to EditStudioModal
2. Create social media input fields with icons
3. Add URL validation and formatting
4. Add "Connections" tab to EditStudioModal
5. Create connection toggle switches with icons
6. Add help text for each connection type
7. Add/verify "Images" tab to EditStudioModal
8. Integrate existing FileUpload component
9. Add image reordering functionality
10. Add alt text editing
11. Add image deletion with confirmation

**Files to Modify**:
- `src/components/admin/EditStudioModal.tsx`

**Estimated Time**: 4 hours

### 6.4 Phase 4: Profile Page Updates (Priority: MEDIUM)
**Tasks**:
1. Verify "Find us on socials" section displays correctly
2. Re-add "Connections" section to profile page
3. Create connection icon mapping
4. Style connections section to match design
5. Add conditional rendering (hide if no connections)
6. Verify image gallery displays Cloudinary images correctly

**Files to Modify**:
- `src/components/studio/profile/ModernStudioProfileV3.tsx`

**Estimated Time**: 2 hours

### 6.5 Phase 5: Testing & QA (Priority: MEDIUM)
**Tasks**:
1. Test all admin form fields
2. Test save functionality
3. Test profile page display
4. Test Cloudinary integration
5. Test image upload/delete/reorder
6. Test URL validation
7. Cross-browser testing
8. Mobile responsiveness testing

**Estimated Time**: 2 hours

### 6.6 Phase 6: Documentation (Priority: LOW)
**Tasks**:
1. Document new admin features
2. Create admin user guide
3. Document connection types
4. Document image requirements

**Estimated Time**: 1 hour

---

## 7. Technical Considerations

### 7.1 Security
- Validate all URLs server-side
- Sanitize user input to prevent XSS
- Verify admin authentication on all endpoints
- Implement rate limiting on image uploads
- Validate image files are actually images

### 7.2 Performance
- Lazy load images on profile page
- Use Cloudinary transformations for thumbnails
- Cache profile data with Redis (if available)
- Optimize database queries with proper includes

### 7.3 Error Handling
- Graceful degradation if Cloudinary is unavailable
- Clear error messages for failed uploads
- Validation errors shown inline on form fields
- Retry logic for failed API calls

### 7.4 Accessibility
- All form fields have proper labels
- Error messages are announced to screen readers
- Images have alt text fields
- Keyboard navigation works throughout modal
- Focus management when opening/closing modal

---

## 8. Success Metrics

### 8.1 Functional Success
- ✅ Admin can edit all social media URLs
- ✅ Admin can toggle all connection types
- ✅ Admin can manage studio images (upload, reorder, delete)
- ✅ Changes reflect immediately on profile page
- ✅ All images served from Cloudinary CDN

### 8.2 User Experience
- ⏱️ Admin can complete profile edit in < 5 minutes
- 📱 Modal works on mobile devices
- 🎯 Form validation provides clear feedback
- 💾 Auto-save draft functionality (nice-to-have)

### 8.3 Technical Success
- 🚀 Page load time < 2 seconds
- 📦 Image optimization reduces file sizes by 50%+
- 🔒 No security vulnerabilities
- ✅ All tests passing

---

## 9. Out of Scope (Future Enhancements)

- Bulk editing multiple studios at once
- Image cropping/editing tool
- Social media preview cards
- Automated social media link verification
- Integration with social media APIs to pull profile data
- Video upload support
- Audio file management
- Profile page preview in modal (live preview)
- Undo/redo functionality
- Version history for profile changes

---

## 10. Dependencies

- ✅ Cloudinary account and credentials (configured)
- ✅ Database access (configured)
- ✅ Admin authentication (configured)
- ✅ Next.js App Router
- ✅ Prisma ORM
- ✅ Tailwind CSS
- ✅ React Hook Form (if not already using)

---

## 11. Risk Assessment

### 11.1 High Risk
- **Image Migration**: Existing images may not be on Cloudinary
  - *Mitigation*: Create migration script to move images to Cloudinary
  
### 11.2 Medium Risk
- **Database Schema Changes**: Adding new fields may require data migration
  - *Mitigation*: Use Prisma migrations, test thoroughly in development

### 11.3 Low Risk
- **UI Complexity**: Modal may become too large with many tabs
  - *Mitigation*: Use accordion or multi-step wizard if needed

---

## 12. Approval & Sign-off

**Created By**: AI Assistant  
**Date**: 2025-01-10  
**Status**: ✅ Ready for Review

**Approved By**: [Awaiting Client Approval]  
**Date**: [Pending]

---

## Appendix A: Connection Type Icons & Labels

```typescript
const connectionTypes = [
  { id: 'connection1', label: 'Source Connect', icon: '🔗' },
  { id: 'connection2', label: 'Source Connect Now', icon: '🔗' },
  { id: 'connection3', label: 'Phone patch', icon: '📞' },
  { id: 'connection4', label: 'Session Link Pro', icon: '🎤' },
  { id: 'connection5', label: 'Zoom or Teams', icon: '💻' },
  { id: 'connection6', label: 'Cleanfeed', icon: '🎵' },
  { id: 'connection7', label: 'Riverside', icon: '🎬' },
  { id: 'connection8', label: 'Google Hangouts', icon: '📹' },
];
```

## Appendix B: Social Media Platform Icons

Use `lucide-react` icons:
- Facebook: `<Facebook />`
- Twitter: `<Twitter />`
- LinkedIn: `<Linkedin />`
- Instagram: `<Instagram />`
- YouTube: `<Youtube />`
- Vimeo: `<Globe />` (or custom icon)
- SoundCloud: `<Music />`

