'use client';

import { CheckCircle, Circle } from 'lucide-react';

interface ProfileCompletionProgressProps {
  profileData: {
    display_name?: string | undefined;
    username?: string | undefined;
    email?: string | undefined;
    about?: string | undefined;
    short_about?: string | undefined;
    phone?: string | undefined;
    location?: string | undefined;
    studio_name?: string | undefined;
    facebook_url?: string | undefined;
    twitter_url?: string | undefined;
    linkedin_url?: string | undefined;
    instagram_url?: string | undefined;
    youtube_url?: string | undefined;
    vimeo_url?: string | undefined;
    soundcloud_url?: string | undefined;
    connection1?: string | undefined;
    connection2?: string | undefined;
    connection3?: string | undefined;
    connection4?: string | undefined;
    connection5?: string | undefined;
    connection6?: string | undefined;
    connection7?: string | undefined;
    connection8?: string | undefined;
    rate_tier_1?: number | null | undefined;
    website_url?: string | undefined;
    images_count?: number | undefined;
    studio_types_count?: number | undefined;
  };
}

interface ProfileField {
  label: string;
  completed: boolean;
  weight: number; // How much this field contributes to completion (out of 100)
}

export function ProfileCompletionProgress({ profileData }: ProfileCompletionProgressProps) {
  // Count social media links (need at least 2)
  const socialMediaCount = [
    profileData.facebook_url,
    profileData.twitter_url,
    profileData.linkedin_url,
    profileData.instagram_url,
    profileData.youtube_url,
    profileData.vimeo_url,
    profileData.soundcloud_url,
  ].filter(url => url && url.trim() !== '').length;

  // Check if at least one connection method is selected
  const hasConnectionMethod = !!(
    profileData.connection1 === '1' || 
    profileData.connection2 === '1' || 
    profileData.connection3 === '1' || 
    profileData.connection4 === '1' || 
    profileData.connection5 === '1' || 
    profileData.connection6 === '1' || 
    profileData.connection7 === '1' || 
    profileData.connection8 === '1'
  );

  // Define all 14 fields required for profile completion (each worth ~7.14%)
  const fields: ProfileField[] = [
    { label: 'Display Name', completed: !!(profileData.display_name && profileData.display_name.trim()), weight: 7.14 },
    { label: 'Username', completed: !!(profileData.username && profileData.username.trim()), weight: 7.14 },
    { label: 'Short About', completed: !!(profileData.short_about && profileData.short_about.trim()), weight: 7.14 },
    { label: 'Full About', completed: !!(profileData.about && profileData.about.trim()), weight: 7.14 },
    { label: 'Phone', completed: !!(profileData.phone && profileData.phone.trim()), weight: 7.14 },
    { label: 'Location', completed: !!(profileData.location && profileData.location.trim()), weight: 7.14 },
    { label: 'Studio Name', completed: !!(profileData.studio_name && profileData.studio_name.trim()), weight: 7.14 },
    { label: 'Connection Methods', completed: hasConnectionMethod, weight: 7.14 },
    { label: 'Social Media (min 2 links)', completed: socialMediaCount >= 2, weight: 7.14 },
    { label: 'Website URL', completed: !!(profileData.website_url && profileData.website_url.trim()), weight: 7.14 },
    { label: 'At least 1 image', completed: (profileData.images_count || 0) >= 1, weight: 7.14 },
    { label: 'Studio Type selected', completed: (profileData.studio_types_count || 0) >= 1, weight: 7.14 },
    { label: 'Rate Tier 1', completed: !!(profileData.rate_tier_1 && profileData.rate_tier_1 > 0), weight: 7.14 },
    { label: 'Email', completed: !!(profileData.email && profileData.email.trim()), weight: 7.16 }, // 7.16 to round up to 100
  ];

  // Calculate completion percentage
  const completionPercentage = Math.round(
    fields.reduce((total, field) => {
      return total + (field.completed ? field.weight : 0);
    }, 0)
  );

  // Circle SVG parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  // Color based on completion (grey until 75%, amber 75-85%, green >85%)
  const getColor = (percentage: number) => {
    if (percentage > 85) return 'text-green-600';
    if (percentage >= 75) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getStrokeColor = (percentage: number) => {
    if (percentage > 85) return '#16a34a'; // green-600
    if (percentage >= 75) return '#f59e0b'; // amber-600
    return '#6b7280'; // gray-600
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 text-gray-900">Profile Completion</h2>
      
      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Circular Progress */}
        <div className="relative flex items-center justify-center">
          <svg width="180" height="180" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke={getStrokeColor(completionPercentage)}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Percentage text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getColor(completionPercentage)}`}>
              {completionPercentage}%
            </span>
            <span className="text-sm text-gray-600">Complete</span>
          </div>
        </div>

        {/* Completion checklist */}
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-4">
            Complete your profile to increase visibility and attract more clients
          </p>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                {field.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <span className={`text-sm ${field.completed ? 'text-gray-700' : 'text-gray-500'}`}>
                  {field.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

