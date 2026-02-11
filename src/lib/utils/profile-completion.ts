/**
 * Calculate profile completion statistics
 * Returns required fields completion and overall percentage
 * Based on 17 fields (11 required + 6 optional) with weighted calculation
 */

interface ProfileCompletionData {
  user: {
    username: string;
    display_name: string;
    avatar_url?: string | null | undefined;
    email: string;
  };
  profile?: {
    short_about?: string | null | undefined;
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
    images?: any[] | undefined;
    website_url?: string | null | undefined;
  } | undefined;
}

export interface CompletionStats {
  required: {
    completed: number;
    total: number; // Always 11
  };
  overall: {
    percentage: number; // Weighted calculation from 17 fields
  };
}

export function calculateCompletionStats(data: ProfileCompletionData): CompletionStats {
  // Count social media links
  const socialMediaCount = [
    data.profile?.facebook_url,
    data.profile?.x_url,
    data.profile?.linkedin_url,
    data.profile?.instagram_url,
    data.profile?.youtube_url,
    data.profile?.tiktok_url,
    data.profile?.threads_url,
    data.profile?.soundcloud_url,
    data.profile?.vimeo_url,
    data.profile?.bluesky_url,
  ].filter(url => url && url.trim() !== '').length;

  // Check if at least one connection method is selected
  const hasConnectionMethod = !!(
    data.profile?.connection1 === '1' ||
    data.profile?.connection2 === '1' ||
    data.profile?.connection3 === '1' ||
    data.profile?.connection4 === '1' ||
    data.profile?.connection5 === '1' ||
    data.profile?.connection6 === '1' ||
    data.profile?.connection7 === '1' ||
    data.profile?.connection8 === '1' ||
    data.profile?.connection9 === '1' ||
    data.profile?.connection10 === '1' ||
    data.profile?.connection11 === '1' ||
    data.profile?.connection12 === '1'
  );

  // REQUIRED fields (11 fields × 5.92% ≈ 65.12%)
  const requiredFields = [
    { completed: !!(data.user.username && !data.user.username.startsWith('temp_')), weight: 5.92 },
    { completed: !!(data.user.display_name && data.user.display_name.trim()), weight: 5.92 },
    { completed: !!(data.user.email && data.user.email.trim()), weight: 5.92 },
    { completed: !!(data.studio?.name && data.studio.name.trim()), weight: 5.92 },
    { completed: !!(data.profile?.short_about && data.profile.short_about.trim()), weight: 5.92 },
    { completed: !!(data.profile?.about && data.profile.about.trim()), weight: 5.92 },
    { completed: !!(data.studio?.studio_types && data.studio.studio_types.length >= 1), weight: 5.92 },
    { completed: !!(data.profile?.location && data.profile.location.trim()), weight: 5.92 },
    { completed: hasConnectionMethod, weight: 5.92 },
    { completed: !!(data.studio?.website_url && data.studio.website_url.trim()), weight: 5.92 },
    { completed: !!(data.studio?.images && data.studio.images.length >= 1), weight: 5.92 },
  ];

  // OPTIONAL fields (6 fields × 5.88% ≈ 35.28%)
  const optionalFields = [
    { completed: !!(data.user.avatar_url && data.user.avatar_url.trim()), weight: 5.88 },
    { completed: !!(data.profile?.phone && data.profile.phone.trim()), weight: 5.88 },
    { completed: socialMediaCount >= 2, weight: 5.88 },
    {
      completed: !!(data.profile?.rate_tier_1 && (typeof data.profile.rate_tier_1 === 'number' ? data.profile.rate_tier_1 > 0 : parseFloat(data.profile.rate_tier_1 as string) > 0)),
      weight: 5.88
    },
    { completed: !!(data.profile?.equipment_list && data.profile.equipment_list.trim()), weight: 5.88 },
    { completed: !!(data.profile?.services_offered && data.profile.services_offered.trim()), weight: 5.88 },
  ];

  // Count required fields completed
  const requiredCompleted = requiredFields.filter(f => f.completed).length;
  const requiredTotal = 11;

  // Calculate total completion percentage using weighted calculation
  const allFields = [...requiredFields, ...optionalFields];
  const completionPercentage = Math.round(
    allFields.reduce((total, field) => {
      return total + (field.completed ? field.weight : 0);
    }, 0)
  );

  return {
    required: {
      completed: requiredCompleted,
      total: requiredTotal,
    },
    overall: {
      percentage: Math.min(completionPercentage, 100), // Cap at 100%
    },
  };
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
