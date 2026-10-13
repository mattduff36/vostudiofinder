/** The completion score is a product contract shared by dashboard, admin and gates. */
export const COMPLETION_SOCIAL_FIELDS = [
  'facebook_url', 'x_url', 'linkedin_url', 'instagram_url', 'youtube_url',
  'tiktok_url', 'threads_url', 'soundcloud_url', 'vimeo_url', 'bluesky_url',
] as const;
export const COMPLETION_CONNECTION_FIELDS = [
  'connection1', 'connection2', 'connection3', 'connection4', 'connection5', 'connection6',
  'connection7', 'connection8', 'connection9', 'connection10', 'connection11', 'connection12',
] as const;

export interface CompletionInput {
  username?: string | null | undefined;
  display_name?: string | null | undefined;
  email?: string | null | undefined;
  avatar_url?: string | null | undefined;
  studio_name?: string | null | undefined;
  images_count?: number | undefined;
  studio_types_count?: number | undefined;
    short_about?: string | null | undefined;
    about_me?: string | null | undefined;
    about?: string | null | undefined;
    phone?: string | null | undefined;
    location?: string | null | undefined;
    website_url?: string | null | undefined;
    connection1?: string | null | undefined;
    connection2?: string | null | undefined;
    connection3?: string | null | undefined;
    connection4?: string | null | undefined;
    connection5?: string | null | undefined;
    connection6?: string | null | undefined;
    connection7?: string | null | undefined;
    connection8?: string | null | undefined;
    connection9?: string | null | undefined;
    connection10?: string | null | undefined;
    connection11?: string | null | undefined;
    connection12?: string | null | undefined;
    rate_tier_1?: number | string | null | undefined;
    equipment_list?: string | null | undefined;
    services_offered?: string | null | undefined;
    facebook_url?: string | null | undefined;
    x_url?: string | null | undefined;
    linkedin_url?: string | null | undefined;
    instagram_url?: string | null | undefined;
    youtube_url?: string | null | undefined;
    tiktok_url?: string | null | undefined;
    threads_url?: string | null | undefined;
    soundcloud_url?: string | null | undefined;
    vimeo_url?: string | null | undefined;
    bluesky_url?: string | null | undefined;
}

export interface ProfileCompletionData {
  user: {
    username: string;
    display_name: string;
    avatar_url?: string | null | undefined;
    email: string;
  };
  profile?: {
    short_about?: string | null | undefined;
    about_me?: string | null | undefined;
    about?: string | null | undefined;
    phone?: string | null | undefined;
    location?: string | null | undefined;
    website_url?: string | null | undefined;
    connection1?: string | null | undefined;
    connection2?: string | null | undefined;
    connection3?: string | null | undefined;
    connection4?: string | null | undefined;
    connection5?: string | null | undefined;
    connection6?: string | null | undefined;
    connection7?: string | null | undefined;
    connection8?: string | null | undefined;
    connection9?: string | null | undefined;
    connection10?: string | null | undefined;
    connection11?: string | null | undefined;
    connection12?: string | null | undefined;
    rate_tier_1?: number | string | null | undefined;
    equipment_list?: string | null | undefined;
    services_offered?: string | null | undefined;
    facebook_url?: string | null | undefined;
    x_url?: string | null | undefined;
    linkedin_url?: string | null | undefined;
    instagram_url?: string | null | undefined;
    youtube_url?: string | null | undefined;
    tiktok_url?: string | null | undefined;
    threads_url?: string | null | undefined;
    soundcloud_url?: string | null | undefined;
    vimeo_url?: string | null | undefined;
    bluesky_url?: string | null | undefined;
  } | undefined;
  studio?: {
    name?: string | null | undefined;
    studio_types?: string[] | undefined;
    images?: readonly unknown[] | undefined;
    website_url?: string | null | undefined;
  } | undefined;
}

export interface CompletionStats {
  required: { completed: number; total: number };
  overall: { percentage: number };
}
export type CompletionItemId = 'username' | 'display_name' | 'email' | 'studio_name' |
  'short_about' | 'about' | 'studio_types' | 'location' | 'connections' | 'website_url' |
  'images' | 'avatar' | 'about_me' | 'phone' | 'social' | 'rate' | 'equipment' | 'services';
export interface CompletionItem {
  id: CompletionItemId;
  label: string;
  required: boolean;
  completed: boolean;
  weight: number;
}
export interface CompletionBreakdown extends CompletionStats {
  items: CompletionItem[];
  optional: { completed: number; total: number };
}

const hasText = (value: string | null | undefined): boolean => !!value?.trim();

export function getProfileCompletion(input: CompletionInput): CompletionBreakdown {
  const checks: Array<[CompletionItemId, string, boolean]> = [
    // Deliberately preserve the legacy username presence/temp_ predicate (including whitespace).
    ['username', 'Username', !!input.username && !input.username.startsWith('temp_')],
    ['display_name', 'Display Name', hasText(input.display_name)],
    ['email', 'Email', hasText(input.email)],
    ['studio_name', 'Studio Name', hasText(input.studio_name)],
    ['short_about', 'Short Description', hasText(input.short_about)],
    ['about', 'Full Description', hasText(input.about)],
    ['studio_types', 'Studio Type selected', (input.studio_types_count ?? 0) >= 1],
    ['location', 'Location', hasText(input.location)],
    ['connections', 'Connection Methods', COMPLETION_CONNECTION_FIELDS.some(field => input[field] === '1')],
    ['website_url', 'Website URL', hasText(input.website_url)],
    ['images', 'At least 1 image', (input.images_count ?? 0) >= 1],
    ['avatar', 'Avatar', hasText(input.avatar_url)],
    ['about_me', 'About Me', hasText(input.about_me)],
    ['phone', 'Phone', hasText(input.phone)],
    ['social', 'Social Media (min 2 links)', COMPLETION_SOCIAL_FIELDS.filter(field => hasText(input[field])).length >= 2],
    ['rate', 'Session Rate Tier(s)', !!input.rate_tier_1 && (typeof input.rate_tier_1 === 'number' ? input.rate_tier_1 > 0 : parseFloat(input.rate_tier_1) > 0)],
    ['equipment', 'Equipment List', hasText(input.equipment_list)],
    ['services', 'Services Offered', hasText(input.services_offered)],
  ];
  const items = checks.map(([id, label, completed], index): CompletionItem => ({
    id, label, completed, required: index < 11, weight: index < 11 ? 5.91 : 5,
  }));
  return {
    items,
    required: { completed: items.filter(item => item.required && item.completed).length, total: 11 },
    optional: { completed: items.filter(item => !item.required && item.completed).length, total: 7 },
    overall: { percentage: Math.min(100, Math.round(items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0))) },
  };
}

export function completionInputFromLegacy(data: ProfileCompletionData): CompletionInput {
  return {
    ...data.profile,
    ...data.user,
    studio_name: data.studio?.name,
    studio_types_count: data.studio?.studio_types?.length ?? 0,
    images_count: data.studio?.images?.length ?? 0,
    // The studio URL is authoritative. Never fall back to profile.website_url.
    website_url: data.studio?.website_url,
  };
}

/** Preserve the exact nested input and stats-only output used by existing callers. */
export function calculateCompletionStats(data: ProfileCompletionData): CompletionStats {
  const { required, overall } = getProfileCompletion(completionInputFromLegacy(data));
  return { required, overall };
}

/**
 * Get text color class based on completion percentage
 */
export function getCompletionColor(percentage: number): string {
  if (percentage < 50) return 'text-red-600';
  if (percentage < 80) return 'text-yellow-600';
  return 'text-green-600';
}

/**
 * Get background color class based on completion percentage
 */
export function getCompletionBgColor(percentage: number): string {
  if (percentage < 50) return 'bg-red-600';
  if (percentage < 80) return 'bg-yellow-500';
  return 'bg-green-600';
}
