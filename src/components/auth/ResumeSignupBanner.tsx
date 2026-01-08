'use client';

import { AlertCircle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ResumeSignupBannerProps {
  resumeStep: 'username' | 'payment' | 'profile';
  timeRemaining: {
    days: number;
    hours: number;
    total: number;
  };
  onResume: () => void;
  onStartFresh: () => void;
  isLoading?: boolean;
}

const STEP_LABELS = {
  username: 'Username Selection',
  payment: 'Membership Payment',
  profile: 'Profile Creation',
};

const STEP_DESCRIPTIONS = {
  username: 'Choose your unique username',
  payment: 'Complete your £25/year membership payment',
  profile: 'Create your studio profile',
};

export function ResumeSignupBanner({
  resumeStep,
  timeRemaining,
  onResume,
  onStartFresh,
  isLoading = false,
}: ResumeSignupBannerProps) {
  const { days, hours } = timeRemaining;
  
  const getTimeText = () => {
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return 'Less than 1 hour';
  };

  return (
    <Modal isOpen={true} preventBackdropClose={true} maxWidth="lg">
      <div className="py-8 px-4 sm:px-10">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Welcome Back! You Have an Incomplete Signup
            </h3>
            
            <p className="text-text-secondary mb-4">
              You started signing up but didn't finish. Good news – we saved your progress!
            </p>

            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Next Step:</p>
                  <p className="text-base font-semibold text-text-primary">{STEP_LABELS[resumeStep]}</p>
                  <p className="text-sm text-text-secondary mt-1">{STEP_DESCRIPTIONS[resumeStep]}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Time Remaining:</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <p className="text-base font-semibold text-text-primary">{getTimeText()}</p>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">Your reservation expires after this time</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onResume}
                disabled={isLoading}
                variant="primary"
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Continue Where I Left Off
                  </>
                )}
              </Button>
              
              <Button
                onClick={onStartFresh}
                disabled={isLoading}
                variant="outline"
              >
                Start Fresh
              </Button>
            </div>

            <p className="text-xs text-text-secondary mt-3">
              💡 <strong>Tip:</strong> Continuing your signup is faster and preserves your progress!
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

