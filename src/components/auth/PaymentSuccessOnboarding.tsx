'use client';

import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { useState } from 'react';

interface ProfileField {
  name: string;
  required: boolean;
  completed: boolean;
  where: string;
  how: string;
  why: string;
}

interface PaymentSuccessOnboardingProps {
  userName: string;
  completionPercentage: number;
  requiredFields: ProfileField[];
  optionalFields: ProfileField[];
}

export function PaymentSuccessOnboarding({
  userName,
  completionPercentage,
  requiredFields,
  optionalFields,
}: PaymentSuccessOnboardingProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const toggleField = (fieldName: string) => {
    setExpandedField(expandedField === fieldName ? null : fieldName);
  };

  const completedRequired = requiredFields.filter(f => f.completed).length;
  const totalRequired = requiredFields.length;
  const completedOptional = optionalFields.filter(f => f.completed).length;
  const totalOptional = optionalFields.length;

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col py-8 px-4">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/voiceover-studio-finder-header-logo2-black.png"
            alt="VoiceoverStudioFinder"
            width={450}
            height={71}
            priority
            className="h-auto max-w-full"
          />
        </div>

        {/* Success Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Welcome to VoiceoverStudioFinder, {userName}!
            </p>
            
            {/* Profile Completion Circle */}
            <div className="flex justify-center items-center my-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke={completionPercentage >= 85 ? '#10b981' : completionPercentage >= 75 ? '#f59e0b' : '#6b7280'}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionPercentage / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{completionPercentage}%</span>
                  <span className="text-xs text-gray-600">Complete</span>
                </div>
              </div>
            </div>

            <p className="text-gray-700">
              Your profile is <span className="font-semibold">{completionPercentage}% complete</span>
            </p>
          </div>
        </div>

        {/* Profile Status Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Profile Status</h2>
          
          {/* Required Fields */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Required Fields
              </h3>
              <span className="text-sm text-gray-600">
                {completedRequired} of {totalRequired} completed
              </span>
            </div>
            <div className="space-y-2">
              {requiredFields.map((field) => (
                <div key={field.name} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleField(field.name)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {field.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-900">{field.name}</span>
                      <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                        Required
                      </span>
                    </div>
                    {expandedField === field.name ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedField === field.name && (
                    <div className="px-4 pb-4 space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Where: </span>
                        <span className="text-gray-600">{field.where}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">How: </span>
                        <span className="text-gray-600">{field.how}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Why: </span>
                        <span className="text-gray-600">{field.why}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Optional Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Optional Fields
              </h3>
              <span className="text-sm text-gray-600">
                {completedOptional} of {totalOptional} completed
              </span>
            </div>
            <div className="space-y-2">
              {optionalFields.map((field) => (
                <div key={field.name} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleField(field.name)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {field.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-900">{field.name}</span>
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded">
                        Optional
                      </span>
                    </div>
                    {expandedField === field.name ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedField === field.name && (
                    <div className="px-4 pb-4 space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Where: </span>
                        <span className="text-gray-600">{field.where}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">How: </span>
                        <span className="text-gray-600">{field.how}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Why: </span>
                        <span className="text-gray-600">{field.why}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Profile Tips Section */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Tips</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-red-600 mr-2">•</span>
              <span><strong>Complete your profile to 100%</strong> to maximize visibility and attract more clients</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-600 mr-2">•</span>
              <span><strong>Required fields must be completed</strong> before your profile can go live and be searchable</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-600 mr-2">•</span>
              <span><strong>Optional fields improve your profile quality</strong> and help you stand out from other studios</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-600 mr-2">•</span>
              <span><strong>Upload high-quality images</strong> to showcase your studio space and equipment professionally</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-600 mr-2">•</span>
              <span><strong>Keep descriptions detailed but concise</strong> - focus on what makes your studio unique</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-600 mr-2">•</span>
              <span><strong>Update your profile regularly</strong> to keep it fresh and show you're actively managing your listing</span>
            </li>
          </ul>
        </div>

        {/* CTA Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Complete Your Profile?</h2>
          <p className="text-gray-600 mb-6">
            Head to your dashboard to fill in your studio details and start receiving inquiries
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-lg px-8 py-3"
          >
            Go to Dashboard
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Complete your profile to start receiving inquiries from voice artists worldwide
          </p>
        </div>
      </div>
    </div>
  );
}
