import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProfileEditButton } from '@/components/profile/ProfileEditButton';

interface UsernameLayoutProps {
  children: ReactNode;
  params: Promise<{ username: string }>;
}

export default async function UsernameLayout({ children, params }: UsernameLayoutProps) {
  const session = await getServerSession(authOptions);
  const { username } = await params;

  // Only show edit button if admin is logged in
  const isAdmin = session?.user?.email === 'admin@mpdee.co.uk';

  return (
    <>
      {isAdmin && <ProfileEditButton username={username} />}
      {children}
    </>
  );
}

