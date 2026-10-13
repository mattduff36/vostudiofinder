'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { z } from 'zod';

export const SANDBOX_STORAGE_KEY = 'adminSandbox';
const dateValue = z.string().refine(value => value === '' || (/^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value));
export const sandboxSchema = z.object({
  enabled: z.boolean().default(false), profileCompletion: z.number().min(0).max(100).default(100),
  isVerified: z.boolean().default(false), membershipActive: z.boolean().default(true),
  membershipTier: z.enum(['BASIC', 'PREMIUM']).default('PREMIUM'), studioIsFeatured: z.boolean().default(false),
  featuredRemaining: z.number().int().min(0).max(6).default(6), nextAvailableDate: dateValue.default(''),
  legacyProfile: z.boolean().default(false), legacyVoiceoverRestricted: z.boolean().default(false),
  legacyVoiceoverGrace: z.boolean().default(false),
});
export type SandboxState = z.infer<typeof sandboxSchema>;
export const DEFAULT_SANDBOX: SandboxState = sandboxSchema.parse({});
interface SandboxStore { values: SandboxState; initialized: boolean; storageError: string | null }
const useSandboxStore = create<SandboxStore>(() => ({ values: DEFAULT_SANDBOX, initialized: false, storageError: null }));
let listening = false;

function readStorage() {
  try {
    const stored = sessionStorage.getItem(SANDBOX_STORAGE_KEY);
    const values = sandboxSchema.parse(stored ? JSON.parse(stored) : {});
    useSandboxStore.setState({ values, initialized: true, storageError: null });
  } catch {
    useSandboxStore.setState({ values: DEFAULT_SANDBOX, initialized: true,
      storageError: 'Sandbox settings could not be restored. Overrides are disabled until settings can be saved.' });
  }
}
export function initializeAdminSandbox() {
  if (typeof window === 'undefined') return;
  if (!useSandboxStore.getState().initialized) readStorage();
  if (!listening) {
    listening = true;
    window.addEventListener('storage', event => { if (event.storageArea === sessionStorage && (!event.key || event.key === SANDBOX_STORAGE_KEY)) readStorage(); });
  }
}
export function updateAdminSandbox(patch: Partial<SandboxState>) {
  initializeAdminSandbox();
  const parsed = sandboxSchema.safeParse({ ...useSandboxStore.getState().values, ...patch });
  if (!parsed.success) { useSandboxStore.setState({ storageError: 'Invalid sandbox settings. Please check the entered values.' }); return false; }
  try {
    sessionStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(parsed.data));
    // All same-document consumers observe this exact state, with no polling.
    useSandboxStore.setState({ values: parsed.data, storageError: null }); return true;
  } catch { useSandboxStore.setState({ storageError: 'Sandbox settings could not be saved. The previous settings remain active.' }); return false; }
}
export function resetAdminSandbox() {
  initializeAdminSandbox();
  try {
    sessionStorage.removeItem(SANDBOX_STORAGE_KEY);
    useSandboxStore.setState({ values: DEFAULT_SANDBOX, storageError: null }); return true;
  } catch { useSandboxStore.setState({ storageError: 'Sandbox settings could not be reset. The previous settings remain active.' }); return false; }
}
export function useAdminSandbox() {
  const values = useSandboxStore(state => state.values);
  useEffect(initializeAdminSandbox, []);
  return values;
}
export function useSandboxStorageError() { return useSandboxStore(state => state.storageError); }
