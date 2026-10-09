import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { requireEmailVerification } from '@/lib/auth-guards';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';
import { MembershipPayment } from '@/components/auth/MembershipPayment';
import { incompleteUsernameDestination } from '@/lib/signup/username-routing';

export const metadata: Metadata = {
  title: 'Studio Membership - Voiceover Studio Finder',
  description: 'Join as a studio owner for free or upgrade to Premium for £30/year to unlock all features and connect with voice artists worldwide',
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

    const incomplete = incompleteUsernameDestination(user);
    if (incomplete) {
      redirect(incomplete);
    }

    // If params are missing, rebuild them from the signed-in user
    if (!params.userId && !params.email) {
      const paymentParams = new URLSearchParams();
      paymentParams.set('userId', user.id);
      paymentParams.set('email', user.email);
      paymentParams.set('name', user.display_name);
      paymentParams.set('username', user.username);
      redirect(`/auth/membership?${paymentParams.toString()}`);
    }

    await requireEmailVerification(user.id, user.email);
  }

  // CRITICAL: Verify email before allowing payment
  // Use userId or email from query params to check verification
  if (!session) {
    if (params.userId || params.email) {
      const identified = await db.users.findUnique({
        where: params.userId ? { id: params.userId } : { email: params.email!.toLowerCase() },
        select: {
          id: true,
          email: true,
          display_name: true,
          username: true,
          status: true,
        },
      });

      if (!identified) {
        redirect('/auth/signup');
      }

      const incomplete = incompleteUsernameDestination(identified);
      if (incomplete) {
        redirect(incomplete);
      }

      await requireEmailVerification(identified.id, identified.email);
    } else {
      // No user identification provided - redirect to signup
      console.error('[ERROR] Payment page accessed without user identification');
      redirect('/auth/signup');
    }
  }

  return <MembershipPayment />;
}
