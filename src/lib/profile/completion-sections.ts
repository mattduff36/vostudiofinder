import type { CompletionItemId, getProfileCompletion } from '@/lib/utils/profile-completion';

export const PROFILE_SECTION_IDS = ['basic', 'contact', 'rates', 'social', 'connections', 'images', 'privacy', 'advanced', 'admin'] as const;
export type ProfileSectionId = typeof PROFILE_SECTION_IDS[number];
export function isProfileSection(value: unknown): value is ProfileSectionId {
  return typeof value === 'string' && (PROFILE_SECTION_IDS as readonly string[]).includes(value);
}
export function completionEditSection(id: CompletionItemId, context: 'owner' | 'admin'): ProfileSectionId {
  if (context === 'admin' && (id === 'username' || id === 'email')) return 'admin';
  if (id === 'location' || id === 'phone') return 'contact';
  if (id === 'connections' || id === 'images' || id === 'social') return id;
  if (id === 'rate' || id === 'equipment' || id === 'services') return 'rates';
  return 'basic';
}

/** Preserve the editor's section groupings while using the score's exact predicates. */
export function completionSectionStatus(completion: ReturnType<typeof getProfileCompletion>) {
  const done = new Set(completion.items.filter(item => item.completed).map(item => item.id));
  const status = (...ids: CompletionItemId[]) => ids.every(id => done.has(id)) ? 'complete' : 'incomplete';
  return {
    basic: status('username', 'display_name', 'email', 'studio_name', 'studio_types', 'short_about', 'about'),
    contact: status('location', 'website_url'), connections: status('connections'), rates: status('rate'),
    social: status('social'), images: status('images'), privacy: 'neutral', advanced: 'neutral', admin: 'neutral',
  };
}
