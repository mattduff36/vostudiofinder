'use client';

import { useState } from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import { logger } from '@/lib/logger';

interface PrivacySettingsTogglesProps {
  initialSettings: {
    show_email: boolean;
    show_phone: boolean;
    show_address: boolean;
    show_directions: boolean;
  };
  onUpdate?: (settings: Partial<{
    show_email: boolean;
    show_phone: boolean;
    show_address: boolean;
    show_directions: boolean;
  }>) => void;
}

export function PrivacySettingsToggles({ initialSettings, onUpdate }: PrivacySettingsTogglesProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggle = async (field: keyof typeof settings, value: boolean) => {
    setUpdating(field);
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { [field]: value }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update privacy setting');
      }

      // Update local state
      setSettings(prev => ({ ...prev, [field]: value }));
      
      // Call optional callback
      if (onUpdate) {
        onUpdate({ [field]: value });
      }

      showSuccess('Privacy setting updated');
      logger.log(`[PrivacySettings] Updated ${field} to ${value}`);
    } catch (error) {
      logger.error(`[PrivacySettings] Failed to update ${field}:`, error);
      showError('Failed to update privacy setting');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="space-y-3">
        <div className="relative">
          {updating === 'show_email' && (
            <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-10">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            </div>
          )}
          <Toggle
            label="Enable Messages"
            description="Display 'Message Studio' button on public profile"
            checked={settings.show_email}
            onChange={(checked) => handleToggle('show_email', checked)}
            disabled={updating === 'show_email'}
          />
        </div>

        <div className="relative">
          {updating === 'show_phone' && (
            <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-10">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            </div>
          )}
          <Toggle
            label="Show Phone"
            description="Display phone number on public profile"
            checked={settings.show_phone}
            onChange={(checked) => handleToggle('show_phone', checked)}
            disabled={updating === 'show_phone'}
          />
        </div>

        <div className="relative">
          {updating === 'show_address' && (
            <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-10">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            </div>
          )}
          <Toggle
            label="Show Address"
            description="Display address on public profile page"
            checked={settings.show_address}
            onChange={(checked) => handleToggle('show_address', checked)}
            disabled={updating === 'show_address'}
          />
        </div>

        <div className="relative">
          {updating === 'show_directions' && (
            <div className="absolute inset-0 bg-white/50 rounded-lg flex items-center justify-center z-10">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
            </div>
          )}
          <Toggle
            label="Show Directions"
            description="Display 'Get Directions' button on public profile"
            checked={settings.show_directions}
            onChange={(checked) => handleToggle('show_directions', checked)}
            disabled={updating === 'show_directions'}
          />
        </div>
      </div>
    </div>
  );
}
