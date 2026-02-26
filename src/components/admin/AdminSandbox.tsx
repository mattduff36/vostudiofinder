'use client';

import { useState, useEffect, useRef } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { showSuccess, showError } from '@/lib/toast';

const SANDBOX_STORAGE_KEY = 'adminSandbox';

export function AdminSandbox() {
  // Sandbox state
  const [sandboxEnabled, setSandboxEnabled] = useState(false);
  const [sandboxProfileCompletion, setSandboxProfileCompletion] = useState<number>(100);
  const [sandboxIsVerified, setSandboxIsVerified] = useState(false);
  const [sandboxMembershipActive, setSandboxMembershipActive] = useState(true);
  const [sandboxMembershipTier, setSandboxMembershipTier] = useState<'BASIC' | 'PREMIUM'>('PREMIUM');
  const [sandboxStudioIsFeatured, setSandboxStudioIsFeatured] = useState(false);
  const [sandboxFeaturedRemaining, setSandboxFeaturedRemaining] = useState<number>(6);
  const [sandboxNextAvailableDate, setSandboxNextAvailableDate] = useState<string>('');
  const [sandboxLegacyProfile, setSandboxLegacyProfile] = useState(false);
  const [sandboxLegacyVoiceoverRestricted, setSandboxLegacyVoiceoverRestricted] = useState(false);
  const [sandboxLegacyVoiceoverGrace, setSandboxLegacyVoiceoverGrace] = useState(false);
  const [sendingPreviewEmail, setSendingPreviewEmail] = useState(false);
  const initialised = useRef(false);

  // Restore sandbox state from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SANDBOX_STORAGE_KEY);
      if (stored) {
        const s = JSON.parse(stored);
        if (s.enabled) setSandboxEnabled(true);
        if (typeof s.profileCompletion === 'number') setSandboxProfileCompletion(s.profileCompletion);
        if (s.isVerified) setSandboxIsVerified(true);
        if (typeof s.membershipActive === 'boolean') setSandboxMembershipActive(s.membershipActive);
        if (s.membershipTier === 'BASIC' || s.membershipTier === 'PREMIUM') setSandboxMembershipTier(s.membershipTier);
        if (s.studioIsFeatured) setSandboxStudioIsFeatured(true);
        if (typeof s.featuredRemaining === 'number') setSandboxFeaturedRemaining(s.featuredRemaining);
        if (typeof s.nextAvailableDate === 'string') setSandboxNextAvailableDate(s.nextAvailableDate);
        if (s.legacyProfile) setSandboxLegacyProfile(true);
        if (s.legacyVoiceoverRestricted) setSandboxLegacyVoiceoverRestricted(true);
        if (s.legacyVoiceoverGrace) setSandboxLegacyVoiceoverGrace(true);
      }
    } catch { /* ignore corrupt data */ }
    initialised.current = true;
  }, []);

  // Persist sandbox state to sessionStorage whenever any value changes
  useEffect(() => {
    if (!initialised.current) return;
    try {
      const state = {
        enabled: sandboxEnabled,
        profileCompletion: sandboxProfileCompletion,
        isVerified: sandboxIsVerified,
        membershipActive: sandboxMembershipActive,
        membershipTier: sandboxMembershipTier,
        studioIsFeatured: sandboxStudioIsFeatured,
        featuredRemaining: sandboxFeaturedRemaining,
        nextAvailableDate: sandboxNextAvailableDate,
        legacyProfile: sandboxLegacyProfile,
        legacyVoiceoverRestricted: sandboxLegacyVoiceoverRestricted,
        legacyVoiceoverGrace: sandboxLegacyVoiceoverGrace,
      };
      sessionStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(state));
    } catch { /* sessionStorage full or unavailable */ }
  }, [sandboxEnabled, sandboxProfileCompletion, sandboxIsVerified, sandboxMembershipActive, sandboxMembershipTier, sandboxStudioIsFeatured, sandboxFeaturedRemaining, sandboxNextAvailableDate, sandboxLegacyProfile, sandboxLegacyVoiceoverRestricted, sandboxLegacyVoiceoverGrace]);

  const handleReset = () => {
    setSandboxEnabled(false);
    setSandboxProfileCompletion(100);
    setSandboxIsVerified(false);
    setSandboxMembershipActive(true);
    setSandboxMembershipTier('PREMIUM');
    setSandboxStudioIsFeatured(false);
    setSandboxFeaturedRemaining(6);
    setSandboxNextAvailableDate('');
    setSandboxLegacyProfile(false);
    setSandboxLegacyVoiceoverRestricted(false);
    setSandboxLegacyVoiceoverGrace(false);
    try { sessionStorage.removeItem(SANDBOX_STORAGE_KEY); } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Admin Test Sandbox</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Client-side-only overrides to preview how the Membership cards behave in different states.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Toggle
                label="Enable sandbox overrides"
                description="When enabled, the Membership cards will use the values below (UI simulation only)."
                checked={sandboxEnabled}
                onChange={setSandboxEnabled}
              />

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${sandboxEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                {/* Membership tier emulation */}
                <div className="bg-white rounded-lg border border-amber-100 p-4 md:col-span-2">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Membership tier</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Simulate membership tier</label>
                      <p className="text-xs text-gray-500 mb-2">
                        Changes how the Featured and Verified cards evaluate Premium eligibility. Also affects the tier badge and Upgrade CTA visibility.
                      </p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSandboxMembershipTier('BASIC')}
                          className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-colors ${
                            sandboxMembershipTier === 'BASIC'
                              ? 'border-gray-700 bg-gray-100 text-gray-900'
                              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          Basic (Free)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSandboxMembershipTier('PREMIUM')}
                          className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg border-2 transition-colors ${
                            sandboxMembershipTier === 'PREMIUM'
                              ? 'border-amber-500 bg-amber-50 text-amber-900'
                              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          Premium (£25/yr)
                        </button>
                      </div>
                    </div>
                    <Toggle
                      label="Membership active"
                      description="Simulate whether the membership is currently active or expired."
                      checked={sandboxMembershipActive}
                      onChange={setSandboxMembershipActive}
                    />
                  </div>
                </div>

                {/* Legacy profile emulation */}
                <div className="bg-white rounded-lg border border-amber-100 p-4 md:col-span-2">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Legacy profile emulation</p>
                  <div className="space-y-3">
                    <Toggle
                      label="Simulate legacy profile"
                      description="When enabled, the Edit Profile tab treats your account as a legacy profile (created before Jan 2026). This bypasses the required-fields check on the Profile Visibility toggle."
                      checked={sandboxLegacyProfile}
                      onChange={setSandboxLegacyProfile}
                    />
                    <Toggle
                      label="Simulate legacy VOICEOVER restriction"
                      description="When enabled alongside legacy profile, the VOICEOVER studio type is disabled and the restriction warning banner is shown. Simulates a legacy user who has NOT paid for 12+ months."
                      checked={sandboxLegacyVoiceoverRestricted}
                      onChange={(v) => {
                        setSandboxLegacyVoiceoverRestricted(v);
                        if (!v) setSandboxLegacyVoiceoverGrace(false);
                      }}
                    />
                    {sandboxLegacyVoiceoverRestricted && (
                      <div className="ml-6">
                        <Toggle
                          label="Simulate active grace period"
                          description="When enabled, shows the grace period expiry date in the warning banner (14 days from now). When off, simulates a user who has not yet been given a grace period."
                          checked={sandboxLegacyVoiceoverGrace}
                          onChange={setSandboxLegacyVoiceoverGrace}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-amber-100 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Verified badge card</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Profile completion (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={sandboxProfileCompletion}
                        onChange={(e) => setSandboxProfileCompletion(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <Toggle
                      label="Already verified"
                      description="Simulate the studio already having a verified badge."
                      checked={sandboxIsVerified}
                      onChange={setSandboxIsVerified}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-amber-100 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Featured upgrade card</p>
                  <div className="space-y-3">
                    <Toggle
                      label="Studio is currently featured"
                      description="Simulate your studio already being featured (card becomes unavailable)."
                      checked={sandboxStudioIsFeatured}
                      onChange={setSandboxStudioIsFeatured}
                    />

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Featured slots remaining (0–6)</label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={sandboxFeaturedRemaining}
                        onChange={(e) => setSandboxFeaturedRemaining(Math.max(0, Math.min(6, Number(e.target.value))))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Next available date (only used when remaining = 0)</label>
                      <input
                        type="date"
                        value={sandboxNextAvailableDate}
                        onChange={(e) => setSandboxNextAvailableDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave blank to hide the &quot;next available&quot; date.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Preview Section */}
              <div className="mt-6 pt-6 border-t border-amber-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Email Preview (Admin Only)</h4>
                <p className="text-xs text-gray-600 mb-4">
                  Send a sample verification request email to admin@mpdee.co.uk for review before it goes live.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (sendingPreviewEmail) return;
                    
                    setSendingPreviewEmail(true);
                    try {
                      const response = await fetch('/api/admin/test/send-verification-email-preview', {
                        method: 'POST',
                      });
                      
                      if (response.ok) {
                        showSuccess('Preview email sent to admin@mpdee.co.uk! Check your inbox.');
                      } else {
                        const error = await response.json();
                        showError(error.error || 'Failed to send preview email');
                      }
                    } catch {
                      showError('Failed to send preview email');
                    } finally {
                      setSendingPreviewEmail(false);
                    }
                  }}
                  disabled={sendingPreviewEmail}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg border-2 border-blue-400 text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {sendingPreviewEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{sendingPreviewEmail ? 'Sending...' : 'Send Verification Email Preview'}</span>
                </button>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-amber-200 text-amber-900 bg-white hover:bg-amber-50 transition-colors"
                >
                  Reset sandbox
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
