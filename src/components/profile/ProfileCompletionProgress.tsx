'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle, Circle, Pencil } from 'lucide-react';
import { getProfileCompletion } from '@/lib/utils/profile-completion';
import { completionEditSection } from '@/lib/profile/completion-sections';

interface ProfileCompletionProgressProps {
  profileData: {
    display_name?: string | undefined;
    username?: string | undefined;
    email?: string | undefined;
    about?: string | undefined;
    about_me?: string | undefined;
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
    vimeo_url?: string | undefined;
    bluesky_url?: string | undefined;
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

  const completionStats = useMemo(() => getProfileCompletion(profileData), [profileData]);
  const completionPercentage = completionStats.overall.percentage;
  const fields: ProfileField[] = completionStats.items.map(item => ({
    ...item, sectionId: completionEditSection(item.id, 'owner'),
  }));
  const requiredFields = fields.filter(field => field.required);
  const optionalFields = fields.filter(field => !field.required);
  const completedOptionalCount = completionStats.optional.completed;

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
              <div className="absolute bottom-1 right-1 bg-gray-400 text-white rounded-full p-1.5 shadow-md group-hover:bg-[#9C060B] transition-colors">
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
