import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MembershipSuccess } from '@/components/auth/MembershipSuccess';

export const metadata: Metadata = {
  title: 'Membership Complete - VoiceoverStudioFinder',
  description: 'Your studio membership is now active. Complete your account setup.',
};

export default async function MembershipSuccessPage() {
  const session = await getServerSession(authOptions);

  // If already authenticated, redirect based on user type
  if (session) {
    // Special redirect for admin@mpdee.co.uk
    if (session.user?.email === 'admin@mpdee.co.uk') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  return <MembershipSuccess />;
}
