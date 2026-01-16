/**
 * VisibilityToggleMobile - Mobile Profile Visibility Toggle
 * 
 * Compact visibility toggle for mobile
 * Sticky at top of dashboard content
 * 
 * Only visible on mobile (< 768px), feature-gated by Phase 4.
 */
'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface VisibilityToggleMobileProps {
  initialVisibility: boolean;
}

export function VisibilityToggleMobile({
  initialVisibility,
}: VisibilityToggleMobileProps) {
  const [isVisible, setIsVisible] = useState(initialVisibility);
  const [saving, setSaving] = useState(false);

  // Listen for visibility changes from other components (e.g., burger menu)
  useEffect(() => {
    const handleVisibilityChange = (event: CustomEvent<{ isVisible: boolean }>) => {
      setIsVisible(event.detail.isVisible);
    };
    
    window.addEventListener('profile-visibility-changed', handleVisibilityChange as EventListener);
    return () => {
      window.removeEventListener('profile-visibility-changed', handleVisibilityChange as EventListener);
    };
  }, []);

  // Phase 4 feature gate

  const handleToggle = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/user/profile/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !isVisible }),
      });

      if (response.ok) {
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        // Broadcast visibility change to other components
        window.dispatchEvent(new CustomEvent('profile-visibility-changed', { 
          detail: { isVisible: newVisibility } 
        }));
      } else {
        console.error('Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
      <button
        onClick={handleToggle}
        disabled={saving}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          isVisible
            ? 'bg-green-50 border-green-200 hover:border-green-300'
            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center space-x-3">
          {saving ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" aria-hidden="true" />
          ) : isVisible ? (
            <Eye className="w-5 h-5 text-green-600" aria-hidden="true" />
          ) : (
            <EyeOff className="w-5 h-5 text-gray-600" aria-hidden="true" />
          )}
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              Profile {isVisible ? 'Visible' : 'Hidden'}
            </p>
            <p className="text-xs text-gray-500">
              {isVisible ? 'Public can see your profile' : 'Profile is hidden from public'}
            </p>
          </div>
        </div>
        <div
          className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
            isVisible ? 'bg-green-500' : 'bg-gray-300'
          } relative`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
              isVisible ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </div>
      </button>
    </div>
  );
}
