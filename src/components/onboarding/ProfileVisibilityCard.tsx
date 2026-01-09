'use client';

import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileVisibilityCardProps {
  requiredFieldsCompleted: number;
  totalRequiredFields: number;
  overallCompletionPercentage: number;
}

export function ProfileVisibilityCard({
  requiredFieldsCompleted,
  totalRequiredFields,
  overallCompletionPercentage,
}: ProfileVisibilityCardProps) {
  const allRequiredComplete = requiredFieldsCompleted === totalRequiredFields;
  const requiredPercentage = Math.round((requiredFieldsCompleted / totalRequiredFields) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      <div className={`relative overflow-hidden rounded-2xl shadow-2xl border-l-8 ${
        allRequiredComplete 
          ? 'border-green-600 bg-gradient-to-br from-green-50 to-emerald-50' 
          : 'border-red-600 bg-gradient-to-br from-red-50 to-orange-50'
      }`}>
        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <motion.div
              animate={{ 
                rotate: allRequiredComplete ? 0 : [0, -10, 10, -10, 0],
              }}
              transition={{ 
                duration: 0.5,
                repeat: allRequiredComplete ? 0 : Infinity,
                repeatDelay: 3,
              }}
              className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center ${
                allRequiredComplete
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-red-600 to-red-500'
              } shadow-lg`}
            >
              {allRequiredComplete ? (
                <Eye className="w-8 h-8 text-white" strokeWidth={2.5} />
              ) : (
                <EyeOff className="w-8 h-8 text-white" strokeWidth={2.5} />
              )}
            </motion.div>

            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                {allRequiredComplete ? 'Profile Visibility Unlocked!' : 'Unlock Your Profile Visibility'}
              </h2>
              <p className="text-lg text-gray-700 font-medium">
                {allRequiredComplete 
                  ? 'You can now enable your profile to be visible to voice artists'
                  : 'Complete ALL Required Fields to enable Profile Visibility'
                }
              </p>
            </div>
          </div>

          {/* Progress Indicators Side by Side */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Required Fields Progress */}
            <div className={`p-6 rounded-xl border-2 ${
              allRequiredComplete
                ? 'bg-white border-green-300'
                : 'bg-white border-red-300'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {allRequiredComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-bold text-gray-900">Required Fields</span>
                </div>
                <span className={`text-xl font-extrabold ${
                  allRequiredComplete ? 'text-green-600' : 'text-red-600'
                }`}>
                  {requiredFieldsCompleted}/{totalRequiredFields}
                </span>
              </div>
              
              <div className="relative h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    allRequiredComplete
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500'
                      : 'bg-gradient-to-r from-red-600 to-red-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${requiredPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              
              <p className="mt-3 text-sm font-semibold text-gray-700">
                {allRequiredComplete ? (
                  <span className="text-green-700">Must be 10/10 ✓</span>
                ) : (
                  <span className="text-red-700">Must be 10/10 to unlock</span>
                )}
              </p>
            </div>

            {/* Overall Profile Progress */}
            <div className="p-6 bg-white rounded-xl border-2 border-gray-300">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-900">Overall Profile</span>
                <span className="text-xl font-extrabold text-gray-700">
                  {overallCompletionPercentage}%
                </span>
              </div>
              
              <div className="relative h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallCompletionPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              
              <p className="mt-3 text-sm font-semibold text-gray-700">
                Can be less than 100%
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
