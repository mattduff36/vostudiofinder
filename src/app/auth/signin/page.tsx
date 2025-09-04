import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SigninForm } from '@/components/auth/SigninForm';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sign In - VoiceoverStudioFinder',
  description: 'Sign in to your account to access professional recording studios',
};

export default async function SigninPage() {
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
          src="/bakground-images/21920-6.jpg"
          alt="Signin background texture"
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
          <SigninForm />
        </div>
      </div>
    </div>
  );
}
