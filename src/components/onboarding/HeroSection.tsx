'use client';

import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Gift } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { Button } from '@/components/ui/Button';
import { getPromoConfig } from '@/lib/promo';

interface HeroSectionProps {
  userName: string;
  requiredFieldsCompleted: number;
  totalRequiredFields: number;
  overallCompletionPercentage: number;
  isPromo?: boolean;
}

export function HeroSection({
  userName,
  requiredFieldsCompleted,
  totalRequiredFields,
  overallCompletionPercentage,
  isPromo = false,
}: HeroSectionProps) {
  const promoConfig = getPromoConfig();
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

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
            src="/images/voiceover-studio-finder-logo-black-BIG 1.png"
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
          {isPromo && (
            <div className="flex justify-center mb-4">
              <span className="bg-green-100 text-green-800 text-sm font-semibold px-4 py-1.5 rounded-full flex items-center gap-2">
                <Gift className="w-4 h-4" />
                You got the free membership deal! 🎉
              </span>
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
            {isPromo ? 'Membership Activated!' : 'Payment Successful!'}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 font-medium">
            Welcome to Voiceover Studio Finder, {userName}!
          </p>
          {isPromo && (
            <p className="text-sm text-gray-500 mt-2">
              (normally {promoConfig.normalPrice})
            </p>
          )}
        </motion.div>

        {/* Overall Profile Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Overall Profile Completion</h3>
              <span className="text-2xl font-extrabold text-red-600">
                {overallCompletionPercentage}%
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
                animate={{ width: `${overallCompletionPercentage}%` }}
                transition={{ delay: 0.8, duration: 1, ease: 'easeOut' }}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-semibold">
                Required Fields {requiredFieldsCompleted}/{totalRequiredFields}
              </p>
              <p className="text-sm text-gray-700 font-medium">
                {allRequiredComplete ? (
                  <span className="text-green-700 font-semibold">
                    ✓ Complete! Profile Visibility unlocked
                  </span>
                ) : (
                  <>
                    Complete all Required Fields to unlock{' '}
                    <span className="font-semibold text-red-700">Profile Visibility</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-center mt-10 pt-8 border-t border-gray-200"
        >
          <p className="text-gray-700 mb-6 text-lg">
            Head to your dashboard to complete your profile.
          </p>
          <Button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold text-lg px-8 py-4 min-h-[56px] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-2 group touch-manipulation"
            aria-label="Go to your dashboard"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
