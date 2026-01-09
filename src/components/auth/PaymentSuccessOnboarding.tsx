'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { HeroSection } from '@/components/onboarding/HeroSection';
import { ProfileVisibilityCard } from '@/components/onboarding/ProfileVisibilityCard';
import { QuickStartGuide } from '@/components/onboarding/QuickStartGuide';
import { ProfilePreviewCard } from '@/components/onboarding/ProfilePreviewCard';
import { AnimatedFieldCard } from '@/components/onboarding/AnimatedFieldCard';
import { ProfileTipsGrid } from '@/components/onboarding/ProfileTipsGrid';
import { FloatingActionBar } from '@/components/onboarding/FloatingActionBar';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';

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
  const completedRequired = requiredFields.filter(f => f.completed).length;
  const totalRequired = requiredFields.length;
  const allRequiredComplete = completedRequired === totalRequired;

  // Extract profile data for preview
  const studioNameField = requiredFields.find(f => f.name === 'Studio Name');
  const shortAboutField = requiredFields.find(f => f.name === 'Short About');
  const locationField = requiredFields.find(f => f.name === 'Location');
  const websiteField = requiredFields.find(f => f.name === 'Website URL');
  const imagesField = requiredFields.find(f => f.name === 'Studio Images');

  const studioName = studioNameField?.completed ? 'Your Studio Name' : '';
  const shortAbout = shortAboutField?.completed ? 'Your compelling studio description...' : '';
  const location = locationField?.completed ? 'Your City, Country' : '';
  const websiteUrl = websiteField?.completed ? 'https://example.com' : '';
  const hasStudioImage = imagesField?.completed || false;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-red-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white/80" />
      </div>

      {/* Content */}
      <main id="main-content" className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="space-y-8 md:space-y-12">
          {/* Hero Section */}
          <HeroSection
            userName={userName}
            requiredFieldsCompleted={completedRequired}
            totalRequiredFields={totalRequired}
            overallCompletionPercentage={completionPercentage}
          />

          {/* Profile Visibility Section */}
          <ProfileVisibilityCard
            requiredFieldsCompleted={completedRequired}
            totalRequiredFields={totalRequired}
            overallCompletionPercentage={completionPercentage}
          />

          {/* Quick Start Guide */}
          <QuickStartGuide allRequiredComplete={allRequiredComplete} />

          {/* Profile Tips Grid (MOVED UP) */}
          <ProfileTipsGrid />

          {/* Profile Preview */}
          <ProfilePreviewCard
            studioName={studioName}
            shortAbout={shortAbout}
            location={location}
            websiteUrl={websiteUrl}
            hasStudioImage={hasStudioImage}
            allRequiredComplete={allRequiredComplete}
            overallCompletionPercentage={completionPercentage}
          />

          {/* What's Next Section - Field Checklists */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10 border border-gray-100"
          >
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
                What&apos;s Next?
              </h2>
              <p className="text-lg text-gray-600">
                Complete your profile fields to get started
              </p>
            </div>

            {/* Required Fields Section */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-red-200">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Required Fields
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">
                    {completedRequired} of {totalRequired} completed
                  </span>
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                    allRequiredComplete
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}>
                    {allRequiredComplete ? 'Complete ✓' : 'In Progress'}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {requiredFields.map((field, index) => (
                  <AnimatedFieldCard key={field.name} field={field} index={index} />
                ))}
              </div>
            </div>

            {/* Optional Fields Section */}
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Optional Fields
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">
                    {optionalFields.filter(f => f.completed).length} of {optionalFields.length} completed
                  </span>
                  <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                    Improves Quality
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {optionalFields.map((field, index) => (
                  <AnimatedFieldCard key={field.name} field={field} index={index} />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Enhanced CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="bg-gradient-to-br from-red-600 to-red-500 rounded-2xl shadow-2xl p-8 md:p-12 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
              Ready to Complete Your Profile?
            </h2>
            <p className="text-lg md:text-xl text-red-50 mb-8 max-w-2xl mx-auto">
              Head to your dashboard to fill in your studio details and start receiving inquiries from voice artists worldwide
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full sm:w-auto bg-white text-red-600 hover:bg-gray-50 font-bold text-lg px-8 py-4 min-h-[56px] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group touch-manipulation"
                aria-label="Go to your dashboard"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <p className="text-sm text-red-100 mt-6">
              You can always come back to complete this later
            </p>
          </motion.div>

          {/* Footer Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="text-center pb-8"
          >
            <p className="text-gray-600">
              Need help?{' '}
              <a href="/support" className="text-red-600 hover:text-red-700 font-semibold underline">
                Contact Support
              </a>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        completionPercentage={completionPercentage}
        requiredFieldsCompleted={completedRequired}
        totalRequiredFields={totalRequired}
      />
    </div>
  );
}
