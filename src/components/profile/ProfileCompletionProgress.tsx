'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle, Circle, Pencil } from 'lucide-react';
import { calculateCompletionStats } from '@/lib/utils/profile-completion';

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
    x_url?: string | undefined;
    linkedin_url?: string | undefined;
    instagram_url?: string | undefined;
    youtube_url?: string | undefined;
    tiktok_url?: string | undefined;
    threads_url?: string | undefined;
    soundcloud_url?: string | undefined;
    connection1?: string | undefined;
    connection2?: string | undefined;
    connection3?: string | undefined;
    connection4?: string | undefined;
    connection5?: string | undefined;
    connection6?: string | undefined;
    connection7?: string | undefined;
    connection8?: string | undefined;
    connection9?: string | undefined;
    connection10?: string | undefined;
    connection11?: string | undefined;
    connection12?: string | undefined;
    rate_tier_1?: number | string | null | undefined;
    website_url?: string | undefined;
    images_count?: number | undefined;
    studio_types_count?: number | undefined;
    avatar_url?: string | undefined;
    equipment_list?: string | undefined;
    services_offered?: string | undefined;
  };
  showLists?: boolean;
  showTitle?: boolean;
  mobileVariant?: boolean;
  renderWidget?: (widget: ReactNode) => ReactNode;
}

interface ProfileField {
  label: string;
  completed: boolean;
  required: boolean;
  sectionId?: string; // The Edit Profile section tab to navigate to
}

export function ProfileCompletionProgress({ 
  profileData, 
  showLists = true,
  showTitle = true,
  mobileVariant = false,
  renderWidget
}: ProfileCompletionProgressProps) {

  // Use the single source of truth for calculation
  const completionStats = useMemo(() => {
    return calculateCompletionStats({
      user: {
        username: profileData.username || '',
        display_name: profileData.display_name || '',
        email: profileData.email || '',
        avatar_url: profileData.avatar_url || null,
      },
      profile: {
        short_about: profileData.short_about || null,
        about: profileData.about || null,
        phone: profileData.phone || null,
        location: profileData.location || null,
        connection1: profileData.connection1 || null,
        connection2: profileData.connection2 || null,
        connection3: profileData.connection3 || null,
        connection4: profileData.connection4 || null,
        connection5: profileData.connection5 || null,
        connection6: profileData.connection6 || null,
        connection7: profileData.connection7 || null,
        connection8: profileData.connection8 || null,
        connection9: profileData.connection9 || null,
        connection10: profileData.connection10 || null,
        connection11: profileData.connection11 || null,
        connection12: profileData.connection12 || null,
        rate_tier_1: profileData.rate_tier_1 || null,
        equipment_list: profileData.equipment_list || null,
        services_offered: profileData.services_offered || null,
        facebook_url: profileData.facebook_url || null,
        x_url: profileData.x_url || null,
        linkedin_url: profileData.linkedin_url || null,
        instagram_url: profileData.instagram_url || null,
        youtube_url: profileData.youtube_url || null,
        tiktok_url: profileData.tiktok_url || null,
        threads_url: profileData.threads_url || null,
        soundcloud_url: profileData.soundcloud_url || null,
      },
      studio: {
        name: profileData.studio_name || null,
        studio_types: profileData.studio_types_count ? Array(profileData.studio_types_count).fill('type') : [],
        images: profileData.images_count ? Array(profileData.images_count).fill({}) : [],
        website_url: profileData.website_url || null,
      },
    });
  }, [profileData]);

  const completionPercentage = completionStats.overall.percentage;

  // Count social media links (need at least 2) - memoized to prevent recalculation on every render
  const socialMediaCount = useMemo(() => [
    profileData.facebook_url,
    profileData.x_url,
    profileData.linkedin_url,
    profileData.instagram_url,
    profileData.youtube_url,
    profileData.tiktok_url,
    profileData.threads_url,
    profileData.soundcloud_url,
  ].filter(url => url && url.trim() !== '').length, [
    profileData.facebook_url,
    profileData.x_url,
    profileData.linkedin_url,
    profileData.instagram_url,
    profileData.youtube_url,
    profileData.tiktok_url,
    profileData.threads_url,
    profileData.soundcloud_url,
  ]);

  // Check if at least one connection method is selected
  const hasConnectionMethod = !!(
    profileData.connection1 === '1' || 
    profileData.connection2 === '1' || 
    profileData.connection3 === '1' || 
    profileData.connection4 === '1' || 
    profileData.connection5 === '1' || 
    profileData.connection6 === '1' || 
    profileData.connection7 === '1' || 
    profileData.connection8 === '1' ||
    profileData.connection9 === '1' ||
    profileData.connection10 === '1' ||
    profileData.connection11 === '1' ||
    profileData.connection12 === '1'
  );

  // REQUIRED fields - must complete all 11 to publish profile - memoized
  const requiredFields = useMemo((): ProfileField[] => [
    { label: 'Username', completed: !!(profileData.username && !profileData.username.startsWith('temp_')), required: true, sectionId: 'basic' },
    { label: 'Display Name', completed: !!(profileData.display_name && profileData.display_name.trim()), required: true, sectionId: 'basic' },
    { label: 'Email', completed: !!(profileData.email && profileData.email.trim()), required: true, sectionId: 'basic' },
    { label: 'Studio Name', completed: !!(profileData.studio_name && profileData.studio_name.trim()), required: true, sectionId: 'basic' },
    { label: 'Short About', completed: !!(profileData.short_about && profileData.short_about.trim()), required: true, sectionId: 'basic' },
    { label: 'Full About', completed: !!(profileData.about && profileData.about.trim()), required: true, sectionId: 'basic' },
    { label: 'Studio Type selected', completed: (profileData.studio_types_count || 0) >= 1, required: true, sectionId: 'basic' },
    { label: 'Location', completed: !!(profileData.location && profileData.location.trim()), required: true, sectionId: 'contact' },
    { label: 'Connection Methods', completed: hasConnectionMethod, required: true, sectionId: 'connections' },
    { label: 'Website URL', completed: !!(profileData.website_url && profileData.website_url.trim()), required: true, sectionId: 'contact' },
    { label: 'At least 1 image', completed: (profileData.images_count || 0) >= 1, required: true, sectionId: 'images' },
  ], [profileData.username, profileData.display_name, profileData.email, profileData.studio_name, profileData.short_about, profileData.about, profileData.studio_types_count, profileData.location, hasConnectionMethod, profileData.website_url, profileData.images_count]);

  // OPTIONAL fields - boost profile quality, also count toward 100% - memoized
  const optionalFields = useMemo((): ProfileField[] => [
    { label: 'Avatar', completed: !!(profileData.avatar_url && profileData.avatar_url.trim()), required: false, sectionId: 'basic' },
    { label: 'Phone', completed: !!(profileData.phone && profileData.phone.trim()), required: false, sectionId: 'contact' },
    { label: 'Social Media (min 2 links)', completed: socialMediaCount >= 2, required: false, sectionId: 'social' },
    { label: 'Session Rate Tier(s)', completed: !!(profileData.rate_tier_1 && (typeof profileData.rate_tier_1 === 'number' ? profileData.rate_tier_1 > 0 : parseFloat(profileData.rate_tier_1) > 0)), required: false, sectionId: 'rates' },
    { label: 'Equipment List', completed: !!(profileData.equipment_list && profileData.equipment_list.trim()), required: false, sectionId: 'rates' },
    { label: 'Services Offered', completed: !!(profileData.services_offered && profileData.services_offered.trim()), required: false, sectionId: 'rates' },
  ], [profileData.avatar_url, profileData.phone, socialMediaCount, profileData.rate_tier_1, profileData.equipment_list, profileData.services_offered]);

  // Count completed optional fields
  const completedOptionalCount = optionalFields.filter(field => field.completed).length;

  // Handler for field clicks (desktop only) - opens Edit Profile Modal with section selection
  const handleFieldClick = (sectionId?: string) => {
    if (!sectionId || mobileVariant) return;
    
    // Set the target section in sessionStorage for ProfileEditForm to pick up
    sessionStorage.setItem('openProfileSection', sectionId);
    
    // Open Edit Profile Modal
    window.dispatchEvent(new CustomEvent('openEditProfileModal'));
  };

  // Track whether the widget pencil icon has been clicked this session
  const [pencilDismissed, setPencilDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('editProfilePencilDismissed') === '1';
  });

  // Handler for widget click - opens Edit Profile Modal
  const handleWidgetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!pencilDismissed) {
      sessionStorage.setItem('editProfilePencilDismissed', '1');
      setPencilDismissed(true);
    }
    window.dispatchEvent(new CustomEvent('openEditProfileModal'));
  };

  // Check if all required fields are complete
  const allRequiredComplete = requiredFields.every(field => field.completed);

  // Circle SVG parameters - adjust for mobile variant
  const svgSize = mobileVariant ? 100 : 180;
  const radius = mobileVariant ? 40 : 70;
  const strokeWidth = mobileVariant ? 8 : 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  // Color based on completion - GATED: grey until all required complete, then amber 75-85%, green >85%
  const getColor = (percentage: number) => {
    if (!allRequiredComplete) return 'text-gray-600'; // Grey until all required complete
    if (percentage > 85) return 'text-green-600';
    if (percentage >= 75) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getStrokeColor = (percentage: number) => {
    if (!allRequiredComplete) return '#6b7280'; // grey-600 until all required complete
    if (percentage > 85) return '#16a34a'; // green-600
    if (percentage >= 75) return '#f59e0b'; // amber-600
    return '#6b7280'; // gray-600
  };

  return (
    <div>
      {showTitle && (
        <h2 className={`${mobileVariant ? 'text-lg' : 'text-2xl'} font-semibold ${mobileVariant ? 'mb-4' : 'mb-6'} text-gray-900`}>
          Profile Completion
        </h2>
      )}
      
      {mobileVariant ? (
        // Mobile 2-column layout
        <div className="space-y-4">
          {/* Chart and Required Fields in 2 columns */}
          <div className="grid grid-cols-[100px_1fr] gap-4 items-start">
            {/* Circular Progress - Left Column */}
            <div className="relative flex items-center justify-center flex-shrink-0">
              <svg width={svgSize} height={svgSize} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx={svgSize / 2}
                  cy={svgSize / 2}
                  r={radius}
                  stroke="#e5e7eb"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx={svgSize / 2}
                  cy={svgSize / 2}
                  r={radius}
                  stroke={getStrokeColor(completionPercentage)}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Percentage text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-lg font-bold ${getColor(completionPercentage)}`}>
                  {completionPercentage}%
                </span>
              </div>
            </div>

            {/* Required Fields - Right Column */}
            {showLists && (
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Required
                </h3>
                <div className="space-y-1.5">
                  {requiredFields.map((field, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      {field.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${field.completed ? 'text-gray-700' : 'text-gray-500'}`}>
                        {field.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optional Fields - Full Width Below */}
          {showLists && (
            <div className="border-t border-gray-200 pt-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Optional ({completedOptionalCount}/{optionalFields.length} completed)
              </h3>
              <div className="space-y-1.5">
                {optionalFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    {field.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${field.completed ? 'text-gray-700' : 'text-gray-400'}`}>
                      {field.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Desktop layout
        <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Circular Progress */}
        {renderWidget ? renderWidget(
          <button
            onClick={handleWidgetClick}
            aria-label="Edit your profile"
            className="group relative flex items-center justify-center flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer bg-transparent border-0"
            title="Edit profile"
          >
            <svg width={svgSize} height={svgSize} className="transform -rotate-90 transition-opacity group-hover:opacity-80">
              {/* Background circle */}
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke={getStrokeColor(completionPercentage)}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`${mobileVariant ? 'text-base' : 'text-4xl'} font-bold ${getColor(completionPercentage)}`}>
                {completionPercentage}%
              </span>
              {!mobileVariant && (
                <span className="text-sm text-gray-600">Complete</span>
              )}
            </div>
            {/* Pencil icon badge - bottom right, hidden after first click */}
            {!pencilDismissed && (
              <div className="absolute bottom-1 right-1 bg-gray-400 text-white rounded-full p-1.5 shadow-md group-hover:bg-[#d42027] transition-colors">
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={handleWidgetClick}
            aria-label="Edit your profile"
            className="group relative flex items-center justify-center flex-shrink-0 mx-auto md:mx-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer bg-transparent border-0"
            title="Edit profile"
          >
            <svg
              width={svgSize}
              height={svgSize}
              className="transform -rotate-90 transition-opacity group-hover:opacity-80"
            >
              {/* Background circle */}
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke={getStrokeColor(completionPercentage)}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`${mobileVariant ? 'text-base' : 'text-4xl'} font-bold ${getColor(completionPercentage)}`}>
                {completionPercentage}%
              </span>
              {!mobileVariant && (
                <span className="text-sm text-gray-600">Complete</span>
              )}
            </div>
            {/* Pencil icon badge - top right */}
            <div className="absolute -top-2 -right-2 bg-primary-600 text-white rounded-full p-2 shadow-md group-hover:bg-primary-700 transition-colors">
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </div>
          </button>
        )}

        {/* Completion checklist */}
        {showLists && (
          <div className="flex-1">
          {/* REQUIRED SECTION */}
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Required
            </h3>
            <div className="space-y-2">
              {requiredFields.map((field, index) => (
                <button
                  key={index}
                  onClick={() => handleFieldClick(field.sectionId)}
                  className="flex items-center gap-2 w-full text-left hover:bg-gray-50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                  title={`Edit ${field.label}`}
                >
                  {field.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${field.completed ? 'text-gray-700' : 'text-gray-500'}`}>
                    {field.label}
                  </span>
                </button>
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
                <button
                  key={index}
                  onClick={() => handleFieldClick(field.sectionId)}
                  className="flex items-center gap-2 w-full text-left hover:bg-gray-50 rounded px-1 py-0.5 transition-colors cursor-pointer"
                  title={`Edit ${field.label}`}
                >
                  {field.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${field.completed ? 'text-gray-700' : 'text-gray-400'}`}>
                    {field.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
        </div>
      )}
    </div>
  );
}
