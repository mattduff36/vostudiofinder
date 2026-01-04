/**
 * Calculate profile completion percentage
 * Based on 17 fields (11 required + 6 optional)
 */

export interface ProfileCompletionInput {
  // User fields
  username?: string;
  display_name?: string;
  email?: string;
  
  // Studio profile fields
  studio_name?: string;
  short_about?: string;
  about?: string;
  phone?: string;
  location?: string;
  website_url?: string;
  equipment_list?: string;
  services_offered?: string;
  avatar_url?: string;
  
  // Numeric/array fields
  studio_types_count?: number;
  images_count?: number;
  rate_tier_1?: number | string | null;
  
  // Social media
  facebook_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  vimeo_url?: string;
  soundcloud_url?: string;
  
  // Connection methods
  connection1?: string;
  connection2?: string;
  connection3?: string;
  connection4?: string;
  connection5?: string;
  connection6?: string;
  connection7?: string;
  connection8?: string;
}

export function calculateProfileCompletion(data: ProfileCompletionInput): number {
  // Count social media links
  const socialMediaCount = [
    data.facebook_url,
    data.twitter_url,
    data.linkedin_url,
    data.instagram_url,
    data.youtube_url,
    data.vimeo_url,
    data.soundcloud_url,
  ].filter(url => url && url.trim() !== '').length;

  // Check if at least one connection method is selected
  const hasConnectionMethod = !!(
    data.connection1 === '1' || 
    data.connection2 === '1' || 
    data.connection3 === '1' || 
    data.connection4 === '1' || 
    data.connection5 === '1' || 
    data.connection6 === '1' || 
    data.connection7 === '1' || 
    data.connection8 === '1'
  );

  // REQUIRED fields (11 fields × 5.92% ≈ 65.12%)
  const requiredFields = [
    { completed: !!(data.username && data.username.trim()), weight: 5.92 },
    { completed: !!(data.display_name && data.display_name.trim()), weight: 5.92 },
    { completed: !!(data.email && data.email.trim()), weight: 5.92 },
    { completed: !!(data.studio_name && data.studio_name.trim()), weight: 5.92 },
    { completed: !!(data.short_about && data.short_about.trim()), weight: 5.92 },
    { completed: !!(data.about && data.about.trim()), weight: 5.92 },
    { completed: !!(data.studio_types_count && data.studio_types_count >= 1), weight: 5.92 },
    { completed: !!(data.location && data.location.trim()), weight: 5.92 },
    { completed: hasConnectionMethod, weight: 5.92 },
    { completed: !!(data.website_url && data.website_url.trim()), weight: 5.92 },
    { completed: !!(data.images_count && data.images_count >= 1), weight: 5.92 },
  ];

  // OPTIONAL fields (6 fields × 5.88% ≈ 35.28%)
  const optionalFields = [
    { completed: !!(data.avatar_url && data.avatar_url.trim()), weight: 5.88 },
    { completed: !!(data.phone && data.phone.trim()), weight: 5.88 },
    { completed: socialMediaCount >= 2, weight: 5.88 },
    { 
      completed: !!(data.rate_tier_1 && (typeof data.rate_tier_1 === 'number' ? data.rate_tier_1 > 0 : parseFloat(data.rate_tier_1) > 0)), 
      weight: 5.88 
    },
    { completed: !!(data.equipment_list && data.equipment_list.trim()), weight: 5.88 },
    { completed: !!(data.services_offered && data.services_offered.trim()), weight: 5.88 },
  ];

  // Calculate total completion percentage
  const allFields = [...requiredFields, ...optionalFields];
  const completionPercentage = Math.round(
    allFields.reduce((total, field) => {
      return total + (field.completed ? field.weight : 0);
    }, 0)
  );

  return Math.min(completionPercentage, 100); // Cap at 100%
}

/**
 * Get color class based on completion percentage
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

