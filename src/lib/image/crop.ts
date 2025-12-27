/**
 * Image cropping utilities
 * 
 * Provides functions to crop images in the browser and export them
 * at specific dimensions while maintaining aspect ratios.
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportOptions {
  /**
   * Maximum output width (will scale down if needed)
   * Default: 2000
   */
  maxWidth?: number;
  
  /**
   * Maximum output height (will scale down if needed)
   * Default: 960 (matches 25:12 ratio at maxWidth 2000)
   */
  maxHeight?: number;
  
  /**
   * Image quality for JPEG/WebP (0-1)
   * Default: 0.92
   */
  quality?: number;
  
  /**
   * Output format
   * Default: 'image/jpeg'
   */
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  
  /**
   * File name for the exported file
   * Default: 'cropped-image.jpg'
   */
  fileName?: string;
}

/**
 * Creates an image element from a file or URL
 */
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

/**
 * Converts a File to a data URL for preview
 */
export function getImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', reject);
    reader.readAsDataURL(file);
  });
}

/**
 * Crops an image based on the crop area and exports it as a File
 * 
 * @param imageSrc - Source image URL (data URL or blob URL)
 * @param cropArea - Crop area in pixels
 * @param options - Export options
 * @returns A File object with the cropped and resized image
 */
export async function getCroppedImage(
  imageSrc: string,
  cropArea: CropArea,
  options: ExportOptions = {}
): Promise<File> {
  const {
    maxWidth = 2000,
    maxHeight = 960,
    quality = 0.92,
    format = 'image/jpeg',
    fileName = 'cropped-image.jpg'
  } = options;

  // Load the image
  const image = await createImage(imageSrc);
  
  // Create a canvas for cropping
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Calculate the target size while maintaining aspect ratio
  const targetAspect = maxWidth / maxHeight;
  const cropAspect = cropArea.width / cropArea.height;
  
  let outputWidth = maxWidth;
  let outputHeight = maxHeight;
  
  // If crop area is smaller than max dimensions, use crop area size
  if (cropArea.width < maxWidth && cropArea.height < maxHeight) {
    outputWidth = Math.round(cropArea.width);
    outputHeight = Math.round(cropArea.height);
  } else if (cropAspect > targetAspect) {
    // Crop is wider - constrain by width
    outputWidth = maxWidth;
    outputHeight = Math.round(maxWidth / cropAspect);
  } else {
    // Crop is taller - constrain by height
    outputHeight = maxHeight;
    outputWidth = Math.round(maxHeight * cropAspect);
  }

  // Set canvas size to output dimensions
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Draw the cropped image scaled to fit the canvas
  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  // Convert canvas to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }
        
        // Convert blob to File
        const file = new File([blob], fileName, {
          type: format,
          lastModified: Date.now(),
        });
        
        resolve(file);
      },
      format,
      quality
    );
  });
}

/**
 * Gets the pixel crop from react-easy-crop's relative crop
 * 
 * @param croppedAreaPercentages - The crop area in percentages from react-easy-crop
 * @param imageWidth - Original image width in pixels
 * @param imageHeight - Original image height in pixels
 * @returns Crop area in pixels
 */
export function getPixelCrop(
  croppedAreaPercentages: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
): CropArea {
  return {
    x: (croppedAreaPercentages.x / 100) * imageWidth,
    y: (croppedAreaPercentages.y / 100) * imageHeight,
    width: (croppedAreaPercentages.width / 100) * imageWidth,
    height: (croppedAreaPercentages.height / 100) * imageHeight,
  };
}

