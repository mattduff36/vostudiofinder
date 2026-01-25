'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { showSuccess, showError } from '@/lib/toast';

interface ShareProfileButtonProps {
  profileUrl: string;
  profileName: string;
  region?: string; // City or location for the caption
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function ShareProfileButton({
  profileUrl,
  profileName,
  region,
  className = '',
  variant = 'outline',
  size = 'sm',
}: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  // Create a suggested caption that users can edit
  const createCaption = () => {
    const baseCaption = "Just listed our studio on Voiceover Studio Finder.";
    if (region) {
      return `${baseCaption}\nIf you're looking for a studio near ${region}, check us out!\n\n${profileUrl}`;
    }
    return `${baseCaption}\nCheck us out!\n\n${profileUrl}`;
  };

  const handleShare = async () => {
    const caption = createCaption();
    
    // Check if native share is available (primarily mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: profileName,
          text: caption,
          url: '', // URL already included in caption for better control
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
          // Fall back to copy
          copyToClipboard();
        }
      }
    } else {
      // Fall back to copy to clipboard
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    const caption = createCaption();
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      showSuccess('Caption and link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      showError('Failed to copy');
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant={variant}
      size={size}
      className={className}
      aria-label="Share profile"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 mr-2" />
          Share Profile
        </>
      )}
    </Button>
  );
}
