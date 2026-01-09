import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireEmailVerification } from '@/lib/auth-guards';
import { MembershipPayment } from '@/components/auth/MembershipPayment';

export const metadata: Metadata = {
  title: 'Studio Membership - Voiceover Studio Finder',
  description: 'Join as a studio owner for £25/year and connect with voice artists worldwide',
};

interface MembershipPageProps {
  searchParams: Promise<{ userId?: string; email?: string; name?: string; username?: string }>;
}

export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  // Redirect if already authenticated
  if (session) {
    // Special redirect for admin@mpdee.co.uk
    if (session.user?.email === 'admin@mpdee.co.uk') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  // CRITICAL: Verify email before allowing payment
  // Use userId or email from query params to check verification
  if (params.userId || params.email) {
    await requireEmailVerification(params.userId, params.email);
  } else {
    // No user identification provided - redirect to signup
    console.error('[ERROR] Payment page accessed without user identification');
    redirect('/auth/signup');
  }

  return <MembershipPayment />;
}
