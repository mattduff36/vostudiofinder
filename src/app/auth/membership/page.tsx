import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { MembershipPayment } from '@/components/auth/MembershipPayment';

export const metadata: Metadata = {
  title: 'Studio Membership - VoiceoverStudioFinder',
  description: 'Join as a studio owner for £25/year and connect with voice artists worldwide',
};

export default async function MembershipPage() {
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

  return <MembershipPayment />;
}
