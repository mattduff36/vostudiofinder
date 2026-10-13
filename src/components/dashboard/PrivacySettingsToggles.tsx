'use client';

import { useState, useRef, useEffect } from 'react';
import { Toggle } from '@/components/ui/Toggle';
import { Loader2, Lock } from 'lucide-react';
import { showSuccess, showError } from '@/lib/toast';
import { logger } from '@/lib/logger';
import type { TierLimits } from '@/lib/membership-tiers';

export type PrivacyField = 'show_email' | 'show_phone' | 'show_address' | 'show_directions';

interface PrivacySettingsTogglesProps {
  disabled?: boolean;
  saveSetting?: (field: PrivacyField, value: boolean) => Promise<{ value: boolean; tierLimited?: boolean }>;
  initialSettings: {
    show_email: boolean;
    show_phone: boolean;
    show_address: boolean;
    show_directions: boolean;
  };
  tierLimits?: TierLimits | undefined;
  onUpdate?: (settings: Partial<{
    show_email: boolean;
    show_phone: boolean;
    show_address: boolean;
    show_directions: boolean;
  }>) => void;
}

export function PrivacySettingsToggles({ initialSettings, tierLimits, onUpdate, disabled = false, saveSetting }: PrivacySettingsTogglesProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [updating, setUpdating] = useState<string | null>(null);
  const pending = useRef(false);
  useEffect(() => setSettings(initialSettings), [initialSettings.show_email, initialSettings.show_phone, initialSettings.show_address, initialSettings.show_directions]);

  // Default to restrictive (false) when tier data hasn't loaded yet.
  // Server-side validation is the final authority, but the UI should not
  // expose Premium-only controls while waiting for tier data.
  const isPremium = tierLimits?.phoneVisibility ?? false;

  const handleToggle = async (field: PrivacyField, value: boolean) => {
    if (disabled || pending.current) return;
    pending.current = true; setUpdating(field);
    try {
      let confirmed: { value: boolean; tierLimited?: boolean };
      if (saveSetting) confirmed = await saveSetting(field, value);
      else {
        const response = await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: { [field]: value } }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update privacy setting');
        const tierLimited = (data.tierLimitReached?.droppedFields ?? []).includes(field);
        confirmed = { value: tierLimited ? false : value, tierLimited };
      }
      setSettings(previous => ({ ...previous, [field]: confirmed.value }));
      onUpdate?.({ [field]: confirmed.value });
      if (confirmed.tierLimited) showError('This feature requires a Premium membership. Upgrade to unlock it.');
      else showSuccess('Privacy setting updated');
    } catch (error) {
      logger.error(`[PrivacySettings] Failed to update ${field}:`, error);
      showError(error instanceof Error ? error.message : 'Failed to update privacy setting');
    } finally { pending.current = false; setUpdating(null); }
  };

  const PremiumBadge = () => (
    <a
      href="/dashboard/settings?section=membership"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ml-2 hover:bg-amber-100 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <Lock className="w-3 h-3" />
      Premium
    </a>
  );

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
            disabled={disabled || updating !== null}
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
            description={!isPremium ? "Currently unavailable on Basic plan." : "Display phone number on public profile"}
            checked={isPremium ? settings.show_phone : false}
            onChange={(checked) => handleToggle('show_phone', checked)}
            disabled={disabled || updating !== null || !isPremium}
            badge={!isPremium ? <PremiumBadge /> : undefined}
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
            disabled={disabled || updating !== null}
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
            description={!isPremium ? "Currently unavailable on Basic plan." : "Display 'Get Directions' button on public profile"}
            checked={isPremium ? settings.show_directions : false}
            onChange={(checked) => handleToggle('show_directions', checked)}
            disabled={disabled || updating !== null || !isPremium}
            badge={!isPremium ? <PremiumBadge /> : undefined}
          />
        </div>
      </div>

      {!isPremium && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <Lock className="w-3.5 h-3.5 inline mr-1" />
            Some privacy options require a{' '}
            <a href="/dashboard/settings?section=membership" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-amber-900">
              Premium membership
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
