// Optional Cloudinary import - gracefully handle if not available
let cloudinary: any;
try {
  cloudinary = require('cloudinary').v2;
} catch (error) {
  console.error('❌ Cloudinary package not found:', error);
  console.warn('⚠️ Image uploads will be disabled. Install with: npm install cloudinary');
}

// Configure Cloudinary (only if available)
if (cloudinary) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  // Validate environment variables
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Cloudinary configuration incomplete:');
    console.error(`  - CLOUDINARY_CLOUD_NAME: ${cloudName ? '✓' : '✗ MISSING'}`);
    console.error(`  - CLOUDINARY_API_KEY: ${apiKey ? '✓' : '✗ MISSING'}`);
    console.error(`  - CLOUDINARY_API_SECRET: ${apiSecret ? '✓' : '✗ MISSING'}`);
    console.error('⚠️ Please check your .env.local file');
  } else {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    console.log('✅ Cloudinary configured successfully');
  }
}

export interface ImageUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadImage(
  file: Buffer,
  options: {
    folder?: string;
    transformation?: any;
    public_id?: string;
  } = {}
): Promise<ImageUploadResult> {
  if (!cloudinary) {
    const error = 'Cloudinary not available - please install cloudinary package';
    console.error('❌', error);
    throw new Error(error);
  }
  
  // Verify configuration
  const config = cloudinary.config();
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    const error = 'Cloudinary not properly configured - check your .env.local file';
    console.error('❌', error);
    throw new Error(error);
  }
  
  console.log('📤 Uploading image to Cloudinary...');
  
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'voiceover-studios',
      resource_type: 'image' as const,
      quality: 'auto',
      fetch_format: 'auto',
      transformation: options.transformation || [
        { width: 1200, height: 800, crop: 'limit' },
        { quality: 'auto:good' },
      ],
      public_id: options.public_id,
    };

    cloudinary.uploader
      .upload_stream(uploadOptions, (error: any, result: any) => {
        if (error) {
          console.error('❌ Cloudinary upload failed:', error);
          reject(new Error(`Cloudinary upload failed: ${error.message || JSON.stringify(error)}`));
        } else if (result) {
          console.log('✅ Image uploaded successfully:', result.secure_url);
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        } else {
          console.error('❌ Upload failed - no result returned');
          reject(new Error('Upload failed - no result returned'));
        }
      })
      .end(file);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
}

export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  const transformation = [];

  if (options.width || options.height) {
    transformation.push({
      width: options.width,
      height: options.height,
      crop: options.crop || 'fill',
    });
  }

  if (options.quality) {
    transformation.push({ quality: options.quality });
  }

  if (options.format) {
    transformation.push({ format: options.format });
  }

  return cloudinary.url(publicId, {
    transformation,
    secure: true,
  });
}
