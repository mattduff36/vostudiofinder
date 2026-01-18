import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { SignupForm } from '@/components/auth/SignupForm';
import { SignupErrorAlert } from '@/components/auth/SignupErrorAlert';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sign Up - Voiceover Studio Finder',
  description: 'Create your account to get started',
};

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const error = params.error;
  const session = await getServerSession(authOptions);

  // Redirect if already authenticated
  if (session) {
    redirect('/dashboard');
  }

  // Show the signup form
  return (
    <>
      {/* Render error modal separately - portal to body level */}
      {error && <SignupErrorAlert error={error} />}
      
      <div className="h-[calc(100vh-5rem)] overflow-hidden flex flex-col justify-start sm:justify-center py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/background-images/21920-5.jpg"
            alt="Signup background texture"
            fill
            className="object-cover opacity-10"
            priority={false}
          />
        </div>
        
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="flex justify-center mb-4 sm:mb-0">
            <Image
              src="/images/voiceover-studio-finder-logo-black-BIG 1.png"
              alt="VoiceoverStudioFinder"
              width={450}
              height={71}
              priority
              className="h-auto max-w-full"
            />
          </div>
        </div>

        <div className="relative z-10 mt-4 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
          <div className="bg-white/90 backdrop-blur-sm py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <SignupForm />
          </div>
        </div>
      </div>
    </>
  );
}
