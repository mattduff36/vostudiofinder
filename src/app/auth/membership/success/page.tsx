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
    // Verify payment exists in database with SUCCEEDED status
    // Note: redirect() throws a special error that should NOT be caught
    // Moving all redirects outside try-catch to ensure they work properly
    let payment;
    try {
      payment = await db.payments.findUnique({
        where: { stripe_checkout_session_id: params.session_id },
        select: {
          id: true,
          status: true,
          user_id: true,
          metadata: true,
        },
      });
    } catch (error) {
      console.error('Error fetching payment:', error);
      redirect('/auth/signup?error=verification_failed');
    }

    if (!payment) {
      console.error('❌ Payment not found for session_id:', params.session_id);
      console.error('💡 This usually means:');
      console.error('   1. Stripe webhook hasn\'t been received yet (check Stripe CLI is running)');
      console.error('   2. Payment is still processing');
      console.error('   3. Webhook failed to create payment record');
      redirect('/auth/signup?error=payment_not_found');
    }

    if (payment.status !== 'SUCCEEDED') {
      console.error('❌ Payment not succeeded:', payment.status);
      console.error('💡 Payment status:', payment.status);
      redirect('/auth/signup?error=payment_not_completed');
    }

    // Verify user exists and is in valid state (PENDING or ACTIVE)
    // ACTIVE means webhook already processed successfully (race condition - webhook was faster)
    let user;
    try {
      user = await db.users.findUnique({
        where: { id: payment.user_id },
        select: { status: true, email: true },
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      redirect('/auth/signup?error=verification_failed');
    }

    if (!user) {
      console.error('❌ User not found for payment:', payment.user_id);
      redirect('/auth/signup?error=invalid_user_status');
    }

    // Accept both PENDING and ACTIVE status
    // - PENDING: Payment succeeded, but webhook hasn't processed yet
    // - ACTIVE: Webhook processed before page loaded (common due to fast webhooks)
    if (user.status !== 'PENDING' && user.status !== 'ACTIVE') {
      console.error('❌ Invalid user status:', user.status, '(expected PENDING or ACTIVE)');
      redirect('/auth/signup?error=invalid_user_status');
    }

    console.log(`✅ User verified: ${user.email} (status: ${user.status})`);

    // Security: Verify email parameter matches payment's user email (if provided)
    // This prevents unauthorized access if someone gets the session_id
    if (params.email && params.email.toLowerCase() !== user.email.toLowerCase()) {
      console.error('❌ Email mismatch:', params.email, 'vs', user.email);
      redirect('/auth/signup?error=email_mismatch');
    }

    // If email is provided and matches, allow access (user is verifying their own payment)
    // Otherwise, redirect to sign-in to authenticate before accessing profile creation
    if (params.email && params.email.toLowerCase() === user.email.toLowerCase()) {
      console.log(`✅ Payment verified for unauthenticated user: ${user.email} (email verified)`);
      return <MembershipSuccess />;
    }

    // No email provided - require authentication for security
    // Build callback URL WITHOUT pre-encoding to avoid double-encoding
    // We'll encode the entire callbackUrl once when putting it in the signin redirect
    const callbackUrl = `/auth/membership/success?session_id=${params.session_id || ''}&email=${user.email}`;
    
    // Build signin redirect URL manually
    // encodeURIComponent will encode the entire callbackUrl (including @ -> %40) once
    // This avoids double-encoding that would occur if callbackUrl was already encoded
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    const encodedEmail = encodeURIComponent(user.email);
    redirect(`/auth/signin?callbackUrl=${encodedCallbackUrl}&email=${encodedEmail}`);
  }

  // No session and no valid session_id - redirect to signup
  redirect('/auth/signup?error=access_denied');
}
