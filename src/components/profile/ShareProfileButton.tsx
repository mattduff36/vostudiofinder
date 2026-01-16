'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { showSuccess, showError } from '@/lib/toast';

interface ShareProfileButtonProps {
  profileUrl: string;
  profileName: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function ShareProfileButton({
  profileUrl,
  profileName,
  className = '',
  variant = 'outline',
  size = 'sm',
}: ShareProfileButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Check if native share is available (primarily mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: profileName,
          text: `Check out ${profileName} on Voiceover Studio Finder`,
          url: profileUrl,
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
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      showSuccess('Profile link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      showError('Failed to copy link');
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
