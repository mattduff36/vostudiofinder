'use client';

import { motion } from 'framer-motion';
import { CheckSquare, Eye, TrendingUp } from 'lucide-react';

interface QuickStartGuideProps {
  allRequiredComplete: boolean;
}

export function QuickStartGuide({ allRequiredComplete }: QuickStartGuideProps) {
  const steps = [
    {
      number: '01',
      title: 'Complete Required Fields',
      description: 'Fill in all 10 required fields to unlock Profile Visibility toggle',
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

      <div className="space-y-6 md:space-y-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = step.status === 'complete';
          const isActive = step.status === 'active';
          const isPending = step.status === 'pending';

          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.15, duration: 0.5 }}
              className={`relative group ${
                isActive ? 'scale-100' : 'scale-100'
              } transition-transform duration-300`}
            >
              <div
                className={`flex flex-col md:flex-row gap-6 p-6 md:p-8 rounded-xl border-2 transition-all duration-300 ${
                  isComplete
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 hover:border-green-400'
                    : isActive
                    ? `bg-gradient-to-br ${
                        step.color === 'red'
                          ? 'from-red-50 to-orange-50 border-red-300 hover:border-red-400'
                          : 'from-green-50 to-emerald-50 border-green-300 hover:border-green-400'
                      }`
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 hover:border-gray-400'
                } hover:shadow-xl`}
              >
                {/* Number Badge */}
                <div className="flex-shrink-0">
                  <div
                    className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isComplete
                        ? 'bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg shadow-green-500/50'
                        : isActive
                        ? `bg-gradient-to-br ${
                            step.color === 'red'
                              ? 'from-red-600 to-red-500 shadow-lg shadow-red-500/50'
                              : 'from-green-600 to-emerald-600 shadow-lg shadow-green-500/50'
                          }`
                        : 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-lg shadow-gray-500/30'
                    }`}
                  >
                    <span className="text-3xl font-extrabold text-white">
                      {step.number}
                    </span>
                    {isComplete && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white"
                      >
                        <span className="text-white text-sm font-bold">✓</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                      {step.title}
                    </h3>
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
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
                        className={`w-6 h-6 ${
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
                  <p className="text-lg text-gray-700 leading-relaxed">
                    {step.description}
                  </p>
                  
                  {/* Status Badge */}
                  <div className="mt-4">
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                        isComplete
                          ? 'bg-green-600 text-white'
                          : isActive
                          ? step.color === 'red'
                            ? 'bg-red-600 text-white'
                            : 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isComplete ? (
                        <>
                          <span>✓</span> Complete
                        </>
                      ) : isActive ? (
                        <>
                          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
                          Current Step
                        </>
                      ) : (
                        <>Coming Next</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
