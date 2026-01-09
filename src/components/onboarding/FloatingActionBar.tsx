'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface FloatingActionBarProps {
  completionPercentage: number;
  requiredFieldsCompleted: number;
  totalRequiredFields: number;
}

export function FloatingActionBar({
  completionPercentage,
  requiredFieldsCompleted,
  totalRequiredFields,
}: FloatingActionBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();
  
  // Show bar after scrolling down 300px
  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', updateVisibility);
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  const opacity = useTransform(scrollY, [300, 400], [0, 1]);

  const allRequiredComplete = requiredFieldsCompleted === totalRequiredFields;

  return (
    <motion.div
      style={{ opacity }}
      initial={{ y: 100 }}
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
    >
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-gray-200 p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Progress Info */}
            <div className="flex items-center gap-6 flex-1">
              {/* Required Fields */}
              <div className="flex items-center gap-3">
                <div className="hidden md:block">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      allRequiredComplete
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-red-600 to-red-500'
                    }`}
                  >
                    <span className="text-white font-bold text-lg">
                      {requiredFieldsCompleted}/{totalRequiredFields}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Required Fields
                  </p>
                  <p className={`text-xs font-medium ${
                    allRequiredComplete ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {allRequiredComplete ? 'Complete ✓' : `${totalRequiredFields - requiredFieldsCompleted} remaining`}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block h-12 w-px bg-gray-300" />

              {/* Overall Completion */}
              <div className="flex items-center gap-3">
                <div className="hidden md:block">
                  <div className="relative w-12 h-12">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="#e5e7eb"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke={completionPercentage >= 85 ? '#10b981' : '#6b7280'}
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionPercentage / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-900">
                        {completionPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Overall Profile
                  </p>
                  <p className="text-xs font-medium text-gray-600">
                    {completionPercentage >= 85 ? 'Excellent!' : 'Keep going!'}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="hidden md:inline">Go to Dashboard</span>
                <span className="md:hidden">Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
