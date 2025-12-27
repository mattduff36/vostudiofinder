import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Reset Password - VoiceoverStudioFinder',
  description: 'Set a new password for your account',
};

export default async function ResetPasswordPage() {
  const session = await getServerSession(authOptions);

  // Redirect if already authenticated
  if (session) {
    // Special redirect for admin@mpdee.co.uk
    if (session.user?.email === 'admin@mpdee.co.uk') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  return (
    <div className="h-[calc(100vh-5rem)] relative overflow-hidden flex flex-col justify-start sm:justify-center py-8 sm:py-12 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-6.jpg"
          alt="Reset password background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>
      
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center mb-4 sm:mb-0">
          <Image
            src="/images/voiceover-studio-finder-header-logo2-black.png"
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
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}








