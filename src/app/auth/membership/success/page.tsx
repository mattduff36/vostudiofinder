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

  // If already authenticated, check user status
  if (session) {
    // Import db to check user status
    const { db } = await import('@/lib/db');
    
    try {
      const user = await db.users.findUnique({
        where: { email: session.user?.email || '' },
        select: { status: true, email: true },
      });

      // If user is PENDING, allow access to complete profile
      if (user && user.status === 'PENDING') {
        console.log(`✅ PENDING user accessing profile creation: ${user.email}`);
        return <MembershipSuccess />;
      }

      // If user is ACTIVE, redirect to dashboard
      // Special redirect for admin@mpdee.co.uk
      if (session.user?.email === 'admin@mpdee.co.uk') {
        redirect('/admin');
      } else {
        redirect('/dashboard');
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      // On error, allow access (fail open for better UX)
      return <MembershipSuccess />;
    }
  }

  return <MembershipSuccess />;
}
