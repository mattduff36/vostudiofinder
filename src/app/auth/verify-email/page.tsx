import { Metadata } from 'next';
import { Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Verify Your Email - VoiceoverStudioFinder',
  description: 'Please check your email to verify your account',
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="text-4xl font-bold text-primary-600">
            VoiceoverStudioFinder
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Check Your Email
              </h1>
              <p className="mt-2 text-text-secondary">
                We've sent a verification link to your email address. Please click the link to verify your account.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Email sent successfully!</p>
                  <p className="mt-1">
                    If you don't see the email in your inbox, please check your spam folder.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Resend Verification Email
              </Button>
              
              <Button
                onClick={() => window.location.href = '/auth/signin'}
                variant="ghost"
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>

            <div className="text-xs text-text-secondary">
              <p>
                Having trouble? Contact our{' '}
                <a href="/support" className="text-primary-600 hover:text-primary-500">
                  support team
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
