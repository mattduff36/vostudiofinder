import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import VerifyEmailContent from './VerifyEmailContent';

export const metadata: Metadata = {
  title: 'Verify Your Email - Voiceover Studio Finder',
  description: 'Please check your email to verify your account',
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ new?: string; flow?: string; email?: string; error?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  
  // Determine flow type: 'account' (verify only), 'profile' (profile already created), or 'signup' (new signup flow)
  // Support both 'new=true' (legacy) and 'flow=profile' for backward compatibility
  const flow = params?.flow || (params?.new === 'true' ? 'profile' : 'account');
  const email = params?.email;
  const error = params?.error;

  // If email is provided, check if user is already verified
  if (email && !error) {
    try {
      const user = await db.users.findUnique({
        where: { email: email.toLowerCase() },
        select: { 
          id: true, 
          email_verified: true,
          username: true,
          display_name: true,
        },
      });

      // If user is verified, redirect to payment page
      if (user && user.email_verified) {
        console.log(`✅ User ${email} already verified, redirecting to payment`);
        
        // Build payment URL with user data
        const paymentParams = new URLSearchParams();
        paymentParams.set('userId', user.id);
        paymentParams.set('email', email);
        paymentParams.set('name', user.display_name);
        if (user.username && !user.username.startsWith('temp_')) {
          paymentParams.set('username', user.username);
        }
        
        redirect(`/auth/membership?${paymentParams.toString()}`);
      }
    } catch (dbError) {
      console.error('Error checking verification status:', dbError);
      // Continue to render verification page on error
    }
  }

  const flowValue = flow as 'account' | 'profile' | 'signup';
  
  if (email && error) {
    return <VerifyEmailContent flow={flowValue} email={email} error={error} />;
  } else if (email) {
    return <VerifyEmailContent flow={flowValue} email={email} />;
  } else if (error) {
    return <VerifyEmailContent flow={flowValue} error={error} />;
  } else {
    return <VerifyEmailContent flow={flowValue} />;
  }
}