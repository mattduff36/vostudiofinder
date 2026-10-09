import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { UserStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { isCanonicalUsername } from '@/lib/utils/username';
import { membershipPath } from '@/lib/signup/username-routing';
import { UsernameSelectionForm } from '@/components/auth/UsernameSelectionForm';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Choose Username - Voiceover Studio Finder',
  description: 'Select your profile URL username',
};

export default async function UsernameSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ display_name?: string; email?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  let email = params.email || '';
  let displayName = params.display_name || '';

  if (session?.user?.id) {
    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        display_name: true,
        username: true,
        status: true,
      },
    });

    if (!user) {
      redirect('/auth/signup');
    }

    if (user.status === UserStatus.ACTIVE) {
      redirect('/dashboard');
    }

    if (isCanonicalUsername(user.username)) {
      redirect(membershipPath(user));
    }

    email = user.email;
    displayName = displayName || user.display_name;
  }

  return (
    <div className="h-[calc(100dvh-5rem)] relative overflow-hidden flex flex-col justify-start sm:justify-center py-8 sm:py-12 sm:px-6 lg:px-8">
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
          <UsernameSelectionForm initialEmail={email} initialDisplayName={displayName} />
        </div>
      </div>
    </div>
  );
}

