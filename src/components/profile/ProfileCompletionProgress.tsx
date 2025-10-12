'use client';

import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface ProfileCompletionProgressProps {
  profileData: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
    about?: string;
    short_about?: string;
    phone?: string;
    location?: string;
    studio_name?: string;
    facebook_url?: string;
    twitter_url?: string;
    linkedin_url?: string;
    instagram_url?: string;
    youtube_url?: string;
    connection1?: string;
    connection2?: string;
    connection3?: string;
    connection4?: string;
    connection5?: string;
    connection6?: string;
    connection7?: string;
    connection8?: string;
  };
}

interface ProfileField {
  label: string;
  completed: boolean;
  weight: number; // How much this field contributes to completion (out of 100)
}

export function ProfileCompletionProgress({ profileData }: ProfileCompletionProgressProps) {
  // Define all fields that contribute to profile completion
  const fields: ProfileField[] = [
    // Essential fields (higher weight)
    { label: 'Display Name', completed: !!profileData.display_name, weight: 10 },
    { label: 'Username', completed: !!profileData.username, weight: 10 },
    { label: 'Avatar', completed: !!profileData.avatar_url, weight: 15 },
    { label: 'Short About', completed: !!profileData.short_about, weight: 10 },
    { label: 'Full About', completed: !!profileData.about, weight: 15 },
    
    // Contact info (medium weight)
    { label: 'Phone', completed: !!profileData.phone, weight: 5 },
    { label: 'Location', completed: !!profileData.location, weight: 5 },
    { label: 'Studio Name', completed: !!profileData.studio_name, weight: 5 },
    
    // Social media (lower weight, but multiple options)
    { 
      label: 'Social Media', 
      completed: !!(
        profileData.facebook_url || 
        profileData.twitter_url || 
        profileData.linkedin_url || 
        profileData.instagram_url || 
        profileData.youtube_url
      ), 
      weight: 10 
    },
    
    // Connection methods (lower weight, but multiple options)
    { 
      label: 'Connection Methods', 
      completed: !!(
        profileData.connection1 === '1' || 
        profileData.connection2 === '1' || 
        profileData.connection3 === '1' || 
        profileData.connection4 === '1' || 
        profileData.connection5 === '1' || 
        profileData.connection6 === '1' || 
        profileData.connection7 === '1' || 
        profileData.connection8 === '1'
      ), 
      weight: 15 
    },
  ];

  // Calculate completion percentage
  const completionPercentage = fields.reduce((total, field) => {
    return total + (field.completed ? field.weight : 0);
  }, 0);

  // Circle SVG parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  // Color based on completion
  const getColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrokeColor = (percentage: number) => {
    if (percentage >= 80) return '#16a34a'; // green-600
    if (percentage >= 50) return '#ca8a04'; // yellow-600
    return '#dc2626'; // red-600
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-md p-6">
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

