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
    avatar_url?: string | undefined;
    equipment_list?: string | undefined;
    services_offered?: string | undefined;
  };
}

interface ProfileField {
  label: string;
  completed: boolean;
  weight: number; // How much this field contributes to completion (out of 100)
  required: boolean; // Whether this field is required for profile to go live
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

  // REQUIRED fields - must complete all 11 to publish profile (each worth ~9.09%)
  const requiredFields: ProfileField[] = [
    { label: 'Username', completed: !!(profileData.username && profileData.username.trim()), weight: 9.09, required: true },
    { label: 'Display Name', completed: !!(profileData.display_name && profileData.display_name.trim()), weight: 9.09, required: true },
    { label: 'Email', completed: !!(profileData.email && profileData.email.trim()), weight: 9.09, required: true },
    { label: 'Studio Name', completed: !!(profileData.studio_name && profileData.studio_name.trim()), weight: 9.09, required: true },
    { label: 'Short About', completed: !!(profileData.short_about && profileData.short_about.trim()), weight: 9.09, required: true },
    { label: 'Full About', completed: !!(profileData.about && profileData.about.trim()), weight: 9.09, required: true },
    { label: 'Studio Type selected', completed: (profileData.studio_types_count || 0) >= 1, weight: 9.09, required: true },
    { label: 'Location', completed: !!(profileData.location && profileData.location.trim()), weight: 9.09, required: true },
    { label: 'Connection Methods', completed: hasConnectionMethod, weight: 9.09, required: true },
    { label: 'Website URL', completed: !!(profileData.website_url && profileData.website_url.trim()), weight: 9.09, required: true },
    { label: 'At least 1 image', completed: (profileData.images_count || 0) >= 1, weight: 9.11, required: true }, // 9.11 to round to 100
  ];

  // OPTIONAL fields - boost profile quality but not required for publishing
  const optionalFields: ProfileField[] = [
    { label: 'Avatar', completed: !!(profileData.avatar_url && profileData.avatar_url.trim()), weight: 0, required: false },
    { label: 'Phone', completed: !!(profileData.phone && profileData.phone.trim()), weight: 0, required: false },
    { label: 'Social Media (min 2 links)', completed: socialMediaCount >= 2, weight: 0, required: false },
    { label: 'Session Rate Tier(s)', completed: !!(profileData.rate_tier_1 && profileData.rate_tier_1 > 0), weight: 0, required: false },
    { label: 'Equipment List', completed: !!(profileData.equipment_list && profileData.equipment_list.trim()), weight: 0, required: false },
    { label: 'Services Offered', completed: !!(profileData.services_offered && profileData.services_offered.trim()), weight: 0, required: false },
  ];

  // Calculate completion percentage based ONLY on required fields
  const completionPercentage = Math.round(
    requiredFields.reduce((total, field) => {
      return total + (field.completed ? field.weight : 0);
    }, 0)
  );

  // Check if all required fields are complete (profile ready to go live)
  const allRequiredComplete = requiredFields.every(field => field.completed);
  
  // Count completed optional fields
  const completedOptionalCount = optionalFields.filter(field => field.completed).length;

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
      
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Circular Progress */}
        <div className="relative flex items-center justify-center flex-shrink-0">
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
          {/* Profile Status Warning */}
          {!allRequiredComplete && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ Complete all required fields before your profile can go live
              </p>
            </div>
          )}
          
          {allRequiredComplete && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                ✅ All required fields complete! Your profile is ready to publish
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-4">
            Complete required fields to publish your profile. Optional fields help attract more clients.
          </p>

          {/* REQUIRED SECTION */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Required
            </h3>
            <div className="space-y-2">
              {requiredFields.map((field, index) => (
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

          {/* DIVIDER */}
          <div className="border-t border-gray-300 my-4"></div>

          {/* OPTIONAL SECTION */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Optional ({completedOptionalCount}/{optionalFields.length} completed)
            </h3>
            <div className="space-y-2">
              {optionalFields.map((field, index) => (
                <div key={index} className="flex items-center gap-2">
                  {field.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${field.completed ? 'text-gray-700' : 'text-gray-400'}`}>
                    {field.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

