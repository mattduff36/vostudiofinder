import { ReactNode } from 'react';
import { UserEditProfileButton } from '@/components/profile/UserEditProfileButton';

interface UsernameLayoutProps {
  children: ReactNode;
  params: Promise<{ username: string }>;
}

export default async function UsernameLayout({ children, params }: UsernameLayoutProps) {
  const { username } = await params;

  return (
    <>
      <UserEditProfileButton username={username} />
      {children}
    </>
  );
}

