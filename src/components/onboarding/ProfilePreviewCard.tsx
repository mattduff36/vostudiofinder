'use client';

import { motion } from 'framer-motion';
import { MapPin, Globe, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

interface ProfilePreviewCardProps {
  studioName: string;
  shortAbout: string;
  location: string;
  websiteUrl: string;
  hasStudioImage: boolean;
  allRequiredComplete: boolean;
  overallCompletionPercentage: number;
}

export function ProfilePreviewCard({
  studioName,
  shortAbout,
  location,
  websiteUrl,
  hasStudioImage,
  allRequiredComplete,
  overallCompletionPercentage,
}: ProfilePreviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10 border border-gray-100"
    >
      <div className="mb-8">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
          Your Profile Preview
        </h2>
        <p className="text-lg text-gray-600">
          This is how voice artists will see your studio listing
        </p>
      </div>

      {/* Preview Card */}
      <div className="relative">
        {/* Visibility Status Badge */}
        <div className="absolute top-4 right-4 z-10">
          <motion.div
            animate={{
              scale: allRequiredComplete ? [1, 1.1, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: allRequiredComplete ? Infinity : 0,
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-lg ${
              allRequiredComplete
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-white'
            }`}
          >
            {allRequiredComplete ? (
              <>
                <Eye className="w-4 h-4" />
                Visibility: READY
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                Visibility: OFF
              </>
            )}
          </motion.div>
        </div>

        {/* Studio Card */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          {/* Image Section */}
          <div className="relative h-48 bg-gradient-to-br from-red-100 to-orange-100">
            {hasStudioImage ? (
              <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 font-medium">Studio Image</span>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <Image
                    src="/images/voiceover-studio-finder-header-logo2-black.png"
                    alt="Logo"
                    width={48}
                    height={8}
                    className="opacity-30"
                  />
                </div>
                <span className="text-gray-400 font-medium text-sm">
                  Upload studio images
                </span>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-6">
            {/* Studio Name */}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {studioName || 'Your Studio Name'}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">
                {location || 'City, Country'}
              </span>
            </div>

            {/* Short About */}
            <p className="text-gray-700 leading-relaxed mb-4 line-clamp-2">
              {shortAbout || 'Add a short description to tell voice artists what makes your studio special...'}
            </p>

            {/* Website */}
            {websiteUrl && (
              <div className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-semibold">Visit Website</span>
              </div>
            )}

            {/* Completion Badge */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Profile Completion
                </span>
                <span className={`text-lg font-bold ${
                  overallCompletionPercentage >= 85
                    ? 'text-green-600'
                    : overallCompletionPercentage >= 60
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`}>
                  {overallCompletionPercentage}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    overallCompletionPercentage >= 85
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500'
                      : overallCompletionPercentage >= 60
                      ? 'bg-gradient-to-r from-orange-600 to-orange-500'
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${overallCompletionPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Helpful Note */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong className="font-semibold">Pro Tip:</strong> Higher profile completion increases your visibility in search results and attracts more inquiries from voice artists.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
