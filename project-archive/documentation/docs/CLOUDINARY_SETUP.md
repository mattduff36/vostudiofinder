# Cloudinary Setup Guide

This guide will help you complete the Cloudinary setup for your VoiceoverStudioFinder project.

## ✅ What's Already Done

Your project already has:
- Cloudinary SDK installed (`cloudinary: "^1.41.0"`)
- Complete upload/delete API endpoints at `/api/upload/image`
- Cloudinary utility functions in `src/lib/cloudinary.ts`
- Image gallery components for studio management
- Environment variables configured in `env.example`

## 🚀 Quick Setup Steps

### 1. Get Cloudinary Account & Credentials

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. After signup, you'll be taken to your Dashboard
3. Copy these three values from your dashboard:
   - **Cloud Name** (visible in the URL: `https://console.cloudinary.com/console/c-{CLOUD_NAME}/`)
   - **API Key** (in the Account Details section)
   - **API Secret** (click the "eye" icon to reveal it)

### 2. Configure Environment Variables

Create a `.env.local` file in your project root (if it doesn't exist) and add:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your-actual-cloud-name"
CLOUDINARY_API_KEY="your-actual-api-key"
CLOUDINARY_API_SECRET="your-actual-api-secret"
```

**Important:** Replace the placeholder values with your actual Cloudinary credentials.

### 3. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to a studio profile or creation page
3. Try uploading an image to verify everything works

## 🎯 Features Available

### Image Upload
- **Endpoint**: `POST /api/upload/image`
- **Supports**: JPEG, PNG, WebP
- **Max Size**: 5MB per file
- **Auto-optimization**: Images are automatically compressed and optimized
- **Organized Storage**: Images are stored in folders by user ID

### Image Management
- **Delete**: `DELETE /api/upload/image`
- **Automatic transformations**: Resizing, quality optimization
- **CDN delivery**: Fast global image delivery

### Components Available

1. **FileUpload** (`src/components/ui/FileUpload.tsx`)
   - Drag & drop interface
   - Multiple file support
   - Progress indicators
   - Error handling

2. **EnhancedImageGallery** (`src/components/studio/EnhancedImageGallery.tsx`)
   - Drag & drop reordering
   - Image preview modal
   - Edit descriptions
   - Delete functionality

3. **StudioGallery** (`src/components/studio/profile/StudioGallery.tsx`)
   - Lightbox viewer
   - Responsive layout
   - Navigation controls

## 🔧 Advanced Configuration

### Image Transformations

The system automatically applies these optimizations:
- **Size limit**: 1200x800px maximum
- **Quality**: Auto-optimized
- **Format**: Auto-selected (WebP when supported)

To customize transformations, edit `src/lib/cloudinary.ts`:

```typescript
transformation: [
  { width: 1200, height: 800, crop: 'limit' },
  { quality: 'auto:good' },
  { format: 'auto' }
]
```

### Folder Structure

Images are organized as:
```
voiceover-studios/
  ├── {user-id-1}/
  │   ├── image1.jpg
  │   └── image2.png
  └── {user-id-2}/
      └── image3.jpg
```

### Custom Upload Options

You can customize upload behavior:

```typescript
// In your component
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'custom-folder-name');
  
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
};
```

## 🛠️ Usage Examples

### Basic File Upload Component

```tsx
import { FileUpload } from '@/components/ui/FileUpload';

export function MyComponent() {
  const handleUpload = async (file: File) => {
    // Upload logic here
    return { url: 'uploaded-url', id: 'public-id' };
  };

  return (
    <FileUpload
      onUpload={handleUpload}
      accept="image/*"
      maxSize={5}
      multiple={true}
      folder="my-custom-folder"
    />
  );
}
```

### Enhanced Gallery with Upload

```tsx
import { EnhancedImageGallery } from '@/components/studio/EnhancedImageGallery';

export function StudioForm() {
  const [images, setImages] = useState([]);

  return (
    <EnhancedImageGallery
      images={images}
      onImagesChange={setImages}
      maxImages={10}
      isEditing={true}
      folder="studio-galleries"
    />
  );
}
```

## 🔍 Troubleshooting

### Common Issues

1. **"Cloudinary not available" error**
   - Ensure environment variables are set correctly
   - Restart your development server after adding env vars

2. **Upload fails with 401 Unauthorized**
   - Make sure user is logged in
   - Check NextAuth session configuration

3. **Images not displaying**
   - Verify the image URLs are correct
   - Check browser network tab for failed requests
   - Ensure Cloudinary cloud name is correct

4. **Large file uploads fail**
   - Check file size (max 5MB)
   - Verify file type is supported (JPEG, PNG, WebP)

### Environment Variables Check

Add this to any page to verify your setup (remove after testing):

```tsx
// Temporary debug component
export function CloudinaryDebug() {
  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3>Cloudinary Config Check</h3>
      <p>Cloud Name: {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'Not set'}</p>
      <p>API Key: {process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set'}</p>
      <p>API Secret: {process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'}</p>
    </div>
  );
}
```

## 📊 Monitoring & Analytics

Cloudinary provides detailed analytics:
- Upload statistics
- Bandwidth usage
- Transformation usage
- Error rates

Access these in your Cloudinary Dashboard under "Reports".

## 🔒 Security Best Practices

1. **Never expose API secrets** in client-side code
2. **Use signed uploads** for sensitive applications
3. **Implement rate limiting** for upload endpoints
4. **Validate file types** server-side
5. **Set appropriate folder permissions**

## 🚀 Production Deployment

For production deployment:

1. **Set environment variables** in your hosting platform
2. **Configure CDN settings** in Cloudinary
3. **Set up monitoring** and alerts
4. **Test image delivery** from different geographic locations

## 📞 Support

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Support](https://support.cloudinary.com/)
- [Community Forum](https://community.cloudinary.com/)

---

**That's it!** Your Cloudinary integration is now complete and ready to use. Upload some test images to verify everything is working correctly.
