'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, TrendingUp } from 'lucide-react';

interface ProgressIndicatorsProps {
  requiredFieldsCompleted: number;
  totalRequiredFields: number;
  overallCompletionPercentage: number;
  variant?: 'compact' | 'full' | 'minimal' | 'requiredOnly';
}

export function ProgressIndicators({
  requiredFieldsCompleted,
  totalRequiredFields,
  overallCompletionPercentage,
  variant = 'compact',
}: ProgressIndicatorsProps) {
  const requiredPercentage = (requiredFieldsCompleted / totalRequiredFields) * 100;
  const allRequiredComplete = requiredFieldsCompleted === totalRequiredFields;
  const isFullyComplete = overallCompletionPercentage === 100 && allRequiredComplete;

  // Tooltip text for incomplete profiles
  const tooltipText = !isFullyComplete
    ? 'Visit the overview page to see which fields still need to be completed'
    : '';

  // Color based on completion - GATED: grey until all required complete, then amber 75-85%, green >85%
  const getOverallColor = (percentage: number) => {
    if (!allRequiredComplete) return 'text-gray-600'; // Grey until all required complete
    if (percentage > 85) return 'text-green-600';
    if (percentage >= 75) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getOverallBgColor = (percentage: number) => {
    if (!allRequiredComplete) return 'bg-gray-600'; // Grey until all required complete
    if (percentage > 85) return 'bg-green-600';
    if (percentage >= 75) return 'bg-amber-600';
    return 'bg-gray-600';
  };

  if (variant === 'requiredOnly') {
    return (
      <div className="flex items-center gap-2">
        {/* Required Fields Indicator Only */}
        <div className="flex items-center gap-1.5">
          <CheckCircle2 
            className={`w-4 h-4 ${allRequiredComplete ? 'text-green-600' : 'text-gray-400'}`}
            aria-hidden="true"
          />
          <span className="text-xs md:text-sm font-semibold text-gray-700">
            Required:
          </span>
        </div>
        <span className={`text-sm md:text-base font-bold ${allRequiredComplete ? 'text-green-600' : 'text-red-600'}`}>
          {requiredFieldsCompleted}/{totalRequiredFields}
        </span>
        <div className="w-16 md:w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${allRequiredComplete ? 'bg-green-600' : 'bg-red-600'}`}
            initial={{ width: 0 }}
            animate={{ width: `${requiredPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            aria-label={`Required fields: ${requiredFieldsCompleted} of ${totalRequiredFields} completed`}
          />
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-4 md:gap-6 flex-wrap">
        {/* Required Fields Indicator */}
        <div 
          className="flex items-center gap-2"
          title={tooltipText}
        >
          <CheckCircle2 
            className={`w-4 h-4 flex-shrink-0 ${allRequiredComplete ? 'text-green-600' : 'text-gray-400'}`}
            aria-hidden="true"
          />
          <span className="text-xs md:text-sm font-semibold text-gray-700">
            Required:
          </span>
          <span className={`text-sm md:text-base font-bold ${allRequiredComplete ? 'text-green-600' : 'text-red-600'}`}>
            {requiredFieldsCompleted}/{totalRequiredFields}
          </span>
        </div>

        {/* Overall Completion Indicator */}
        <div 
          className="flex items-center gap-2"
          title={tooltipText}
        >
          <TrendingUp 
            className={`w-4 h-4 flex-shrink-0 ${getOverallColor(overallCompletionPercentage)}`}
            aria-hidden="true"
          />
          <span className="text-xs md:text-sm font-semibold text-gray-700">
            Overall:
          </span>
          <span className={`text-sm md:text-base font-bold ${getOverallColor(overallCompletionPercentage)}`}>
            {overallCompletionPercentage}%
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4 md:gap-6">
        {/* Required Fields Indicator */}
        <div 
          className="flex items-center gap-2"
          title={tooltipText}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 
              className={`w-4 h-4 ${allRequiredComplete ? 'text-green-600' : 'text-gray-400'}`}
              aria-hidden="true"
            />
            <span className="text-xs md:text-sm font-semibold text-gray-700">
              Required:
            </span>
          </div>
          <span className={`text-sm md:text-base font-bold ${allRequiredComplete ? 'text-green-600' : 'text-red-600'}`}>
            {requiredFieldsCompleted}/{totalRequiredFields}
          </span>
          <div className="w-16 md:w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${allRequiredComplete ? 'bg-green-600' : 'bg-red-600'}`}
              initial={{ width: 0 }}
              animate={{ width: `${requiredPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              aria-label={`Required fields: ${requiredFieldsCompleted} of ${totalRequiredFields} completed`}
            />
          </div>
        </div>

        {/* Overall Completion Indicator */}
        <div 
          className="flex items-center gap-2"
          title={tooltipText}
        >
          <div className="flex items-center gap-1.5">
            <TrendingUp 
              className={`w-4 h-4 ${getOverallColor(overallCompletionPercentage)}`}
              aria-hidden="true"
            />
            <span className="text-xs md:text-sm font-semibold text-gray-700">
              Overall:
            </span>
          </div>
          <span className={`text-sm md:text-base font-bold ${getOverallColor(overallCompletionPercentage)}`}>
            {overallCompletionPercentage}%
          </span>
          <div className="w-16 md:w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getOverallBgColor(overallCompletionPercentage)} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${overallCompletionPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              aria-label={`Overall profile completion: ${overallCompletionPercentage}%`}
            />
          </div>
        </div>
      </div>
    );
  }

  // Full variant (for potential future use)
  return (
    <div className="space-y-4">
      {/* Required Fields */}
      <div 
        className="space-y-2"
        title={tooltipText}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 
              className={`w-5 h-5 ${allRequiredComplete ? 'text-green-600' : 'text-gray-400'}`}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-gray-700">
              Required Fields
            </span>
          </div>
          <span className={`text-lg font-bold ${allRequiredComplete ? 'text-green-600' : 'text-red-600'}`}>
            {requiredFieldsCompleted}/{totalRequiredFields}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${allRequiredComplete ? 'bg-green-600' : 'bg-red-600'}`}
            initial={{ width: 0 }}
            animate={{ width: `${requiredPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            aria-label={`Required fields: ${requiredFieldsCompleted} of ${totalRequiredFields} completed`}
          />
        </div>
      </div>

      {/* Overall Completion */}
      <div 
        className="space-y-2"
        title={tooltipText}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp 
              className={`w-5 h-5 ${getOverallColor(overallCompletionPercentage)}`}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-gray-700">
              Overall Profile
            </span>
          </div>
          <span className={`text-lg font-bold ${getOverallColor(overallCompletionPercentage)}`}>
            {overallCompletionPercentage}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getOverallBgColor(overallCompletionPercentage)} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${overallCompletionPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            aria-label={`Overall profile completion: ${overallCompletionPercentage}%`}
          />
        </div>
      </div>
    </div>
  );
}
