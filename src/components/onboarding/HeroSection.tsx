'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface HeroSectionProps {
  userName: string;
  requiredFieldsCompleted: number;
  totalRequiredFields: number;
  overallCompletionPercentage: number;
}

export function HeroSection({
  userName,
  requiredFieldsCompleted,
  totalRequiredFields,
  overallCompletionPercentage,
}: HeroSectionProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const requiredPercentage = Math.round((requiredFieldsCompleted / totalRequiredFields) * 100);
  const allRequiredComplete = requiredFieldsCompleted === totalRequiredFields;

  useEffect(() => {
    // Set initial window size
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative motion-reduce:transition-none"
    >
      {/* Subtle Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
          colors={['#dc2626', '#ef4444', '#f87171', '#10b981', '#34d399']}
        />
      )}

      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/voiceover-studio-finder-header-logo2-black.png"
            alt="VoiceoverStudioFinder"
            width={400}
            height={63}
            priority
            className="h-auto max-w-full"
          />
        </div>

        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center mb-8 px-4"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Welcome to Your
            <span className="block bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
              Studio Journey
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 font-medium">
            Great to have you here, {userName}!
          </p>
        </motion.div>

        {/* Dual Progress Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {/* Required Fields Progress */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Required Fields</h3>
              <span className="text-2xl font-extrabold text-red-600">
                {requiredFieldsCompleted}/{totalRequiredFields}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-3 bg-red-200 rounded-full overflow-hidden mb-3">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  allRequiredComplete
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500'
                    : 'bg-gradient-to-r from-red-600 to-red-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${requiredPercentage}%` }}
                transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
              />
            </div>

            <p className="text-sm text-gray-700 font-medium">
              {allRequiredComplete ? (
                <span className="text-green-700 font-semibold">
                  ✓ Complete! Profile Visibility unlocked
                </span>
              ) : (
                <>
                  Complete all to unlock{' '}
                  <span className="font-semibold text-red-700">Profile Visibility</span>
                </>
              )}
            </p>
          </div>

          {/* Overall Profile Completion */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Overall Profile</h3>
              <span className="text-2xl font-extrabold text-gray-700">
                {overallCompletionPercentage}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallCompletionPercentage}%` }}
                transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
              />
            </div>

            <p className="text-sm text-gray-700 font-medium">
              Includes required + optional fields
            </p>
          </div>
        </motion.div>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-center text-gray-600 mt-8 text-lg max-w-2xl mx-auto"
        >
          Your payment was successful. Let&apos;s complete your profile and get you visible to voice artists worldwide.
        </motion.p>
      </div>
    </motion.div>
  );
}
