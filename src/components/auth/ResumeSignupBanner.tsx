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
  payment: 'Complete your Premium membership payment (£25/year)',
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
    <Modal isOpen={true} preventBackdropClose={true} maxWidth="xl">
      <div className="py-10 px-6 sm:px-12">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            Welcome Back! You Have an Incomplete Signup
          </h3>
          <p className="text-text-secondary">
            You started signing up but didn't finish. Good news – we saved your progress!
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Next Step:</p>
              <p className="text-lg font-semibold text-text-primary">{STEP_LABELS[resumeStep]}</p>
              <p className="text-sm text-text-secondary mt-2">{STEP_DESCRIPTIONS[resumeStep]}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Time Remaining:</p>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                <p className="text-lg font-semibold text-text-primary">{getTimeText()}</p>
              </div>
              <p className="text-sm text-text-secondary mt-2">Your reservation expires after this time</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onResume}
            disabled={isLoading}
            variant="primary"
            className="flex items-center gap-2 sm:min-w-[240px]"
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
            className="sm:min-w-[180px]"
          >
            Start Fresh
          </Button>
        </div>
      </div>
    </Modal>
  );
}

