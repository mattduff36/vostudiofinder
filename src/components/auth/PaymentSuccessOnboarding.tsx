'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { HeroSection } from '@/components/onboarding/HeroSection';
import { QuickStartGuide } from '@/components/onboarding/QuickStartGuide';
import { AnimatedFieldCard } from '@/components/onboarding/AnimatedFieldCard';
import { ProfileTipsGrid } from '@/components/onboarding/ProfileTipsGrid';
import { SecurityPrivacySection } from '@/components/onboarding/SecurityPrivacySection';
import { FloatingActionBar } from '@/components/onboarding/FloatingActionBar';

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
      <main id="main-content" className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8 md:py-12 pb-40 md:pb-48">
        <div className="space-y-8 md:space-y-12">
          {/* Hero Section */}
          <HeroSection
            userName={userName}
            requiredFieldsCompleted={completedRequired}
            totalRequiredFields={totalRequired}
            overallCompletionPercentage={completionPercentage}
          />

          {/* Quick Start Guide */}
          <QuickStartGuide allRequiredComplete={allRequiredComplete} />

          {/* Profile Tips Grid */}
          <ProfileTipsGrid />

          {/* Security & Privacy Section */}
          <SecurityPrivacySection />

          {/* Your Data Usage Section - Field Checklists */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10 border border-gray-100"
          >
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
                Your Data Usage
              </h2>
              <p className="text-lg text-gray-600">
                Learn more about what information we ask you for, why we need it, and where it&apos;s used
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

              <div className="grid md:grid-cols-2 gap-4">
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

              <div className="grid md:grid-cols-2 gap-4">
                {optionalFields.map((field, index) => (
                  <AnimatedFieldCard key={field.name} field={field} index={index} />
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* Floating Action Bar */}
      <FloatingActionBar
        completionPercentage={completionPercentage}
        requiredFieldsCompleted={completedRequired}
        totalRequiredFields={totalRequired}
      />
    </div>
  );
}
