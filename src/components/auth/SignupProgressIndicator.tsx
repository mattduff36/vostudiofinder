'use client';

import { Check } from 'lucide-react';

interface SignupProgressIndicatorProps {
  currentStep: 'signup' | 'username' | 'payment' | 'profile';
}

const STEPS = [
  { id: 'signup', label: 'Sign Up', number: 1 },
  { id: 'username', label: 'Username', number: 2 },
  { id: 'payment', label: 'Payment', number: 3 },
  { id: 'profile', label: 'Profile', number: 4 },
];

export function SignupProgressIndicator({ currentStep }: SignupProgressIndicatorProps) {
  const currentStepIndex = STEPS.findIndex(step => step.id === currentStep);

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-center gap-4">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all duration-300
                    ${isCompleted ? 'bg-green-600 text-white' : ''}
                    ${isCurrent ? 'bg-red-600 text-white ring-4 ring-red-200' : ''}
                    ${isUpcoming ? 'bg-gray-200 text-gray-500' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium whitespace-nowrap
                    ${isCurrent ? 'text-red-600' : ''}
                    ${isCompleted ? 'text-green-600' : ''}
                    ${isUpcoming ? 'text-gray-400' : ''}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    w-12 h-1 transition-all duration-300
                    ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

