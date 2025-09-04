import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SignupForm } from '@/components/auth/SignupForm';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sign Up - VoiceoverStudioFinder',
  description: 'Create your account to connect with professional recording studios',
};

export default async function SignupPage() {
  const session = await getServerSession(authOptions);

  // Redirect if already authenticated
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-5.jpg"
          alt="Signup background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="text-4xl font-bold text-primary-600">
            VoiceoverStudioFinder
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/90 backdrop-blur-sm py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
