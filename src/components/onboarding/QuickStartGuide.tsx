'use client';

import { motion } from 'framer-motion';
import { CheckSquare, Eye, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QuickStartGuideProps {
  allRequiredComplete: boolean;
}

export function QuickStartGuide({ allRequiredComplete }: QuickStartGuideProps) {
  const steps = [
    {
      number: '01',
      title: 'Complete Required Fields',
      description: 'Fill in all 11 required fields to unlock Profile Visibility toggle',
      icon: CheckSquare,
      status: allRequiredComplete ? 'complete' : 'active',
      color: 'red',
    },
    {
      number: '02',
      title: 'Turn On Profile Visibility',
      description: 'Enable your profile in dashboard settings once required fields are done',
      icon: Eye,
      status: allRequiredComplete ? 'active' : 'pending',
      color: 'green',
    },
    {
      number: '03',
      title: 'Add Optional Information',
      description: 'Increase profile quality and search ranking with optional fields',
      icon: TrendingUp,
      status: 'pending',
      color: 'blue',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10 border border-gray-100"
    >
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
          Your Quick Start Guide
        </h2>
        <p className="text-lg text-gray-600">
          Follow these steps to get your studio profile live and visible
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {/* Arrow animations between cards on desktop */}
        <div className="hidden md:block absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 z-0">
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ArrowRight className="w-8 h-8 text-red-300" strokeWidth={3} />
          </motion.div>
        </div>
        <div className="hidden md:block absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2 z-0">
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          >
            <ArrowRight className="w-8 h-8 text-red-300" strokeWidth={3} />
          </motion.div>
        </div>

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = step.status === 'complete';
          const isActive = step.status === 'active';

          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.15, duration: 0.5 }}
              className="relative z-10"
            >
              <div
                className={`flex flex-col gap-4 p-6 rounded-xl border-2 transition-all duration-300 h-full ${
                  isComplete
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 hover:shadow-lg'
                    : isActive
                    ? `bg-gradient-to-br ${
                        step.color === 'red'
                          ? 'from-red-50 to-orange-50 border-red-300 hover:shadow-lg'
                          : 'from-green-50 to-emerald-50 border-green-300 hover:shadow-lg'
                      }`
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 hover:shadow-lg'
                }`}
              >
                {/* Number Badge and Icon */}
                <div className="flex items-center justify-between">
                  <div
                    className={`relative w-16 h-16 rounded-xl flex items-center justify-center ${
                      isComplete
                        ? 'bg-gradient-to-br from-green-600 to-emerald-600 shadow-md'
                        : isActive
                        ? `bg-gradient-to-br ${
                            step.color === 'red'
                              ? 'from-red-600 to-red-500 shadow-md'
                              : 'from-green-600 to-emerald-600 shadow-md'
                          }`
                        : 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-md'
                    }`}
                  >
                    <span className="text-2xl font-extrabold text-white">
                      {step.number}
                    </span>
                    {isComplete && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white"
                      >
                        <span className="text-white text-xs font-bold">✓</span>
                      </motion.div>
                    )}
                  </div>
                  
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isComplete
                        ? 'bg-green-100'
                        : isActive
                        ? step.color === 'red'
                          ? 'bg-red-100'
                          : 'bg-green-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isComplete
                          ? 'text-green-600'
                          : isActive
                          ? step.color === 'red'
                            ? 'text-red-600'
                            : 'text-green-600'
                          : 'text-gray-500'
                      }`}
                      strokeWidth={2.5}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                
                {/* Status Badge - not a button */}
                <div className="mt-auto">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold ${
                      isComplete
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : isActive
                        ? step.color === 'red'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-300'
                    }`}
                  >
                    {isComplete ? (
                      <>
                        <span>✓</span> Complete
                      </>
                    ) : isActive ? (
                      <>
                        <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                        Current Step
                      </>
                    ) : (
                      <>Coming Next</>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="text-center mt-10 pt-8 border-t border-gray-200"
      >
        <p className="text-gray-700 mb-6 text-lg">
          Let&apos;s get your profile set up and visible to voice artists.
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
    </motion.div>
  );
}
