// Optional Cloudinary import - gracefully handle if not available
let cloudinary: any;
try {
  cloudinary = require('cloudinary').v2;
} catch (_) {
  console.warn('Cloudinary not available - image uploads will be disabled');
}

// Configure Cloudinary (only if available)
if (cloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
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
    throw new Error('Cloudinary not available - please install cloudinary package');
  }
  
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
          reject(error);
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        } else {
          reject(new Error('Upload failed'));
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
