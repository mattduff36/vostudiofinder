import { Metadata } from 'next';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Access Denied - VoiceoverStudioFinder',
  description: 'You do not have permission to access this resource',
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Access Denied
              </h1>
              <p className="mt-2 text-text-secondary">
                You don't have permission to access this resource. Please contact an administrator if you believe this is an error.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Need different access?</p>
                <p className="mt-1">
                  If you're a studio owner or need elevated permissions, please contact our support team.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              
              <Button
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
            </div>

            <div className="text-xs text-text-secondary">
              <p>
                Need help? Contact our{' '}
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
