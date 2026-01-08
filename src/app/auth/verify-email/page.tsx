import { Metadata } from 'next';
import VerifyEmailContent from './VerifyEmailContent';

export const metadata: Metadata = {
  title: 'Verify Your Email - VoiceoverStudioFinder',
  description: 'Please check your email to verify your account',
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ new?: string; flow?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  
  // Determine flow type: 'account' (verify only) or 'profile' (profile already created)
  // Support both 'new=true' (legacy) and 'flow=profile' for backward compatibility
  const flow = params?.flow || (params?.new === 'true' ? 'profile' : 'account');
  const email = params?.email;

  return <VerifyEmailContent flow={flow as 'account' | 'profile'} {...(email ? { email } : {})} />;
}