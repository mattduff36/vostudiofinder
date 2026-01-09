/**
 * Calculate profile completion statistics
 * Returns required fields completion and overall percentage
 */

interface ProfileCompletionData {
  user: {
    username: string;
    display_name: string;
    avatar_url?: string | null;
  };
  profile?: {
    short_about?: string | null;
    about?: string | null;
    phone?: string | null;
    location?: string | null;
    website_url?: string | null;
    connection1?: string | null;
    connection2?: string | null;
    connection3?: string | null;
    connection4?: string | null;
    connection5?: string | null;
    connection6?: string | null;
    connection7?: string | null;
    connection8?: string | null;
  };
  studio?: {
    name?: string | null;
    studio_types?: string[];
    images?: any[];
  };
}

export interface CompletionStats {
  required: {
    completed: number;
    total: number;
  };
  overall: {
    percentage: number;
  };
}

export function calculateCompletionStats(data: ProfileCompletionData): CompletionStats {
  // Check if at least one connection method is selected
  const hasConnectionMethod = !!(
    data.profile?.connection1 === '1' || 
    data.profile?.connection2 === '1' || 
    data.profile?.connection3 === '1' || 
    data.profile?.connection4 === '1' || 
    data.profile?.connection5 === '1' || 
    data.profile?.connection6 === '1' || 
    data.profile?.connection7 === '1' || 
    data.profile?.connection8 === '1'
  );

  // Required fields (10 total)
  const requiredFields = [
    !!(data.user.username && !data.user.username.startsWith('temp_')), // Username
    !!(data.user.display_name && data.user.display_name.trim()), // Display name
    !!(data.studio?.name && data.studio.name.trim()), // Studio name
    !!(data.profile?.short_about && data.profile.short_about.trim()), // Short about
    !!(data.profile?.about && data.profile.about.trim()), // About
    !!(data.studio?.studio_types && data.studio.studio_types.length >= 1), // Studio types
    !!(data.profile?.location && data.profile.location.trim()), // Location
    hasConnectionMethod, // Connection method
    !!(data.profile?.website_url && data.profile.website_url.trim()), // Website
    !!(data.studio?.images && data.studio.images.length >= 1), // Images
  ];

  const requiredCompleted = requiredFields.filter(Boolean).length;
  const requiredTotal = 10;

  // Calculate overall percentage (includes optional fields)
  // This uses the same logic as calculateProfileCompletion
  const completionData = {
    username: data.user.username,
    display_name: data.user.display_name,
    email: '', // Not used in calculation
    avatar_url: data.user.avatar_url,
    studio_name: data.studio?.name || '',
    short_about: data.profile?.short_about,
    about: data.profile?.about,
    phone: data.profile?.phone,
    location: data.profile?.location,
    website_url: data.profile?.website_url,
    studio_types_count: data.studio?.studio_types?.length || 0,
    images_count: data.studio?.images?.length || 0,
    connection1: data.profile?.connection1,
    connection2: data.profile?.connection2,
    connection3: data.profile?.connection3,
    connection4: data.profile?.connection4,
    connection5: data.profile?.connection5,
    connection6: data.profile?.connection6,
    connection7: data.profile?.connection7,
    connection8: data.profile?.connection8,
  };

  // Simple calculation: count all completed fields
  let completedCount = 0;
  const totalFields = 16; // 10 required + 6 optional

  // Required fields
  completedCount += requiredCompleted;

  // Optional fields
  if (completionData.avatar_url && completionData.avatar_url.trim()) completedCount++;
  if (completionData.phone && completionData.phone.trim()) completedCount++;
  // Social media (counted as 1 field if any are present)
  // Equipment list, services, rate tiers would go here if we had access to them

  const overallPercentage = Math.round((completedCount / totalFields) * 100);

  return {
    required: {
      completed: requiredCompleted,
      total: requiredTotal,
    },
    overall: {
      percentage: overallPercentage,
    },
  };
}
