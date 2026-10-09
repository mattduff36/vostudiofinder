import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { postVerificationPath } from '@/lib/signup/username-routing';
import VerifyEmailContent from './VerifyEmailContent';

export const metadata: Metadata = {
  title: 'Verify Your Email - Voiceover Studio Finder',
  description: 'Please check your email to verify your account',
};

function sanitizeRedirectPath(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return undefined;
  if (trimmed.startsWith('//')) return undefined;
  return trimmed;
}

interface VerifyEmailPageProps {
  searchParams: Promise<{ new?: string; flow?: string; email?: string; error?: string; redirect?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  
  // Determine flow type: 'account' (verify only), 'profile' (profile already created), or 'signup' (new signup flow)
  // Support both 'new=true' (legacy) and 'flow=profile' for backward compatibility
  const flow = params?.flow || (params?.new === 'true' ? 'profile' : 'account');
  const email = params?.email;
  const error = params?.error;
  const redirectTo = sanitizeRedirectPath(params?.redirect);

  // redirect() throws, so compute the destination inside try and leave the try before calling it.
  let destination: string | undefined;
  if (email && !error) {
    try {
      const user = await db.users.findUnique({
        where: { email: email.toLowerCase() },
        select: { 
          id: true, 
          email: true,
          email_verified: true,
          username: true,
          display_name: true,
          status: true,
        },
      });

      if (user && user.email_verified) {
        const customRedirect = flow === 'account' ? (redirectTo || '/dashboard') : redirectTo;
        destination = postVerificationPath(user, {
          redirect: customRedirect ?? null,
          alreadyVerified: flow !== 'account',
        });
      }
    } catch (dbError) {
      console.error('Error checking verification status:', dbError);
    }
  }

  if (destination) {
    redirect(destination);
  }

  const flowValue = flow as 'account' | 'profile' | 'signup';
  const redirectProps = redirectTo ? { redirectTo } : {};
  
  if (email && error) {
    return <VerifyEmailContent flow={flowValue} email={email} error={error} {...redirectProps} />;
  } else if (email) {
    return <VerifyEmailContent flow={flowValue} email={email} {...redirectProps} />;
  } else if (error) {
    return <VerifyEmailContent flow={flowValue} error={error} {...redirectProps} />;
  } else {
    return <VerifyEmailContent flow={flowValue} {...redirectProps} />;
  }
}
