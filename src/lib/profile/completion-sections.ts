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

/** Badges and Edit actions share one grouping, including optional items. */
export function completionSectionStatus(completion: ReturnType<typeof getProfileCompletion>, context: 'owner' | 'admin' = 'owner') {
  return Object.fromEntries(PROFILE_SECTION_IDS.map(section => {
    const items = completion.items.filter(item => completionEditSection(item.id, context) === section);
    return [section, !items.length ? 'neutral' : items.every(item => item.completed) ? 'complete' : 'incomplete'];
  })) as Record<ProfileSectionId, 'complete' | 'incomplete' | 'neutral'>;
}
