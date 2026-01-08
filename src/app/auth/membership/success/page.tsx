import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MembershipSuccess } from '@/components/auth/MembershipSuccess';

export const metadata: Metadata = {
  title: 'Membership Complete - VoiceoverStudioFinder',
  description: 'Your studio membership is now active. Complete your account setup.',
};

interface MembershipSuccessPageProps {
  searchParams: Promise<{ session_id?: string; email?: string; name?: string; username?: string }>;
}

export default async function MembershipSuccessPage({ searchParams }: MembershipSuccessPageProps) {
  const session = await getServerSession(authOptions);
  const { db } = await import('@/lib/db');
  const params = await searchParams;

  // If already authenticated, check user status
  if (session) {
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

  // If not authenticated, verify payment via session_id
  if (!session && params.session_id) {
    try {
      // Verify payment exists in database with SUCCEEDED status
      const payment = await db.payments.findUnique({
        where: { stripe_checkout_session_id: params.session_id },
        select: {
          id: true,
          status: true,
          user_id: true,
          metadata: true,
        },
      });

      if (!payment) {
        console.error('❌ Payment not found for session_id:', searchParams.session_id);
        redirect('/auth/signup?error=payment_not_found');
      }

      if (payment.status !== 'SUCCEEDED') {
        console.error('❌ Payment not succeeded:', payment.status);
        redirect('/auth/signup?error=payment_not_completed');
      }

      // Verify user exists and is PENDING
      const user = await db.users.findUnique({
        where: { id: payment.user_id },
        select: { status: true, email: true },
      });

      if (!user || user.status !== 'PENDING') {
        console.error('❌ User not found or not PENDING:', user?.status);
        redirect('/auth/signup?error=invalid_user_status');
      }

      // Payment verified - allow access
      console.log(`✅ Payment verified for unauthenticated user: ${user.email}`);
      return <MembershipSuccess />;
    } catch (error) {
      console.error('Error verifying payment:', error);
      redirect('/auth/signup?error=verification_failed');
    }
  }

  // No session and no valid session_id - redirect to signup
  redirect('/auth/signup?error=access_denied');
}
