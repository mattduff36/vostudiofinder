'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { X, ZoomIn, ZoomOut, Grid3x3 } from 'lucide-react';
import { getCroppedImage, getImageDataUrl } from '@/lib/image/crop';
import { Button } from '@/components/ui/Button';

interface ImageCropperModalProps {
  /**
   * The file to crop
   */
  file: File | null;
  
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  
  /**
   * Called when the user confirms the crop
   */
  onConfirm: (croppedFile: File) => void;
  
  /**
   * Called when the user cancels
   */
  onCancel: () => void;
  
  /**
   * Aspect ratio (width / height)
   * Default: 25/12 (2.0833...)
   */
  aspect?: number;
  
  /**
   * Maximum output width
   * Default: 2000
   */
  maxWidth?: number;
  
  /**
   * Maximum output height
   * Default: 960
   */
  maxHeight?: number;
}

export function ImageCropperModal({
  file,
  isOpen,
  onConfirm,
  onCancel,
  aspect = 25 / 12,
  maxWidth = 2000,
  maxHeight = 960,
}: ImageCropperModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Track if component is mounted (for portal)
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Load image when file changes
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }

    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        const dataUrl = await getImageDataUrl(file);
        setImageSrc(dataUrl);
        setError(null);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
        };
        img.src = dataUrl;
      } catch (err) {
        setError('Failed to load image');
        console.error('Error loading image:', err);
      }
    };

    loadImage();

    // Cleanup
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file]);

  // Prevent body scroll and hide navigation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('image-modal-open');
    } else {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('image-modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('image-modal-open');
    };
  }, [isOpen]);

  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || !file) return;

    setProcessing(true);
    setError(null);

    try {
      const croppedFile = await getCroppedImage(imageSrc, croppedAreaPixels, {
        maxWidth,
        maxHeight,
        quality: 0.92,
        format: file.type.includes('png') ? 'image/png' : 'image/jpeg',
        fileName: `cropped-${file.name}`,
      });

      onConfirm(croppedFile);
    } catch (err) {
      setError('Failed to crop image. Please try again.');
      console.error('Error cropping image:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    onCancel();
  };

  const handleZoomChange = (value: number) => {
    setZoom(value);
  };

  if (!isOpen || !file || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/70 border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            {/* Info Text */}
            <div className="text-white/60 text-sm space-y-0.5">
              <p>
                <span className="text-white/80 font-medium">Recommended ratio: 25:12</span>
                {' • '}
                Example sizes: 2500×1200 or 2000×960
              </p>
              {imageSize && (
                <p className="text-white/50 text-xs">
                  Original size: {imageSize.width}×{imageSize.height}px
                </p>
              )}
            </div>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-colors ${
                showGrid
                  ? 'bg-white/20 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
              title={showGrid ? 'Hide grid' : 'Show grid'}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleCancel}
            disabled={processing}
            className="p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Crop Area */}
      <div className="relative w-full h-full">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={showGrid}
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
              },
              cropAreaStyle: {
                border: '2px solid rgba(255, 255, 255, 0.5)',
              },
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/70 border-t border-white/10">
        <div className="p-6 space-y-4">
          {/* Zoom Slider */}
          <div className="max-w-md mx-auto">
            <label className="flex items-center justify-between text-white text-sm mb-2">
              <span className="flex items-center space-x-2">
                <ZoomOut className="w-4 h-4" />
                <span>Zoom</span>
              </span>
              <span className="flex items-center space-x-2">
                <span>{Math.round(zoom * 100)}%</span>
                <ZoomIn className="w-4 h-4" />
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${
                  ((zoom - 1) / 2) * 100
                }%, rgba(255,255,255,0.2) ${((zoom - 1) / 2) * 100}%, rgba(255,255,255,0.2) 100%)`,
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-md mx-auto bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={processing}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing || !croppedAreaPixels}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Confirm & Upload'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal in a portal at document.body level
  return createPortal(modalContent, document.body);
}

