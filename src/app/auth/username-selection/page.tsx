import { Metadata } from 'next';
import { UsernameSelectionForm } from '@/components/auth/UsernameSelectionForm';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Choose Username - VoiceoverStudioFinder',
  description: 'Select your profile URL username',
};

export default function UsernameSelectionPage() {
  return (
    <div className="h-[calc(100vh-5rem)] relative overflow-hidden flex flex-col justify-start sm:justify-center py-8 sm:py-12 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Username selection background texture"
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
          <UsernameSelectionForm />
        </div>
      </div>
    </div>
  );
}

