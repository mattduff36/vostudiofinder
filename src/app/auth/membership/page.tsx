import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireEmailVerification } from '@/lib/auth-guards';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';
import { MembershipPayment } from '@/components/auth/MembershipPayment';
import { isFreeSignupPromoActive } from '@/lib/promo';

const isPromoActive = isFreeSignupPromoActive();

export const metadata: Metadata = {
  title: 'Studio Membership - Voiceover Studio Finder',
  description: isPromoActive 
    ? 'Join as a studio owner FREE for a limited time (normally £25/year) and connect with voice artists worldwide'
    : 'Join as a studio owner for £25/year and connect with voice artists worldwide',
};

interface MembershipPageProps {
  searchParams: Promise<{ userId?: string; email?: string; name?: string; username?: string }>;
}

export default async function MembershipPage({ searchParams }: MembershipPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (session?.user?.id) {
    const user = await db.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        display_name: true,
        username: true,
        status: true,
        email_verified: true,
      },
    });

    if (!user) {
      redirect('/auth/signup');
    }

    if (user.status === UserStatus.ACTIVE) {
      redirect('/dashboard');
    }

    // If params are missing, rebuild them from the signed-in user
    if (!params.userId && !params.email) {
      const paymentParams = new URLSearchParams();
      paymentParams.set('userId', user.id);
      paymentParams.set('email', user.email);
      paymentParams.set('name', user.display_name);
      if (user.username && !user.username.startsWith('temp_')) {
        paymentParams.set('username', user.username);
      }
      redirect(`/auth/membership?${paymentParams.toString()}`);
    }

    await requireEmailVerification(user.id, user.email);
  }

  // CRITICAL: Verify email before allowing payment
  // Use userId or email from query params to check verification
  if (!session) {
    if (params.userId || params.email) {
      await requireEmailVerification(params.userId, params.email);
    } else {
      // No user identification provided - redirect to signup
      console.error('[ERROR] Payment page accessed without user identification');
      redirect('/auth/signup');
    }
  }

  return <MembershipPayment />;
}
