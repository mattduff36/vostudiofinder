import { Metadata } from 'next';
import VerifyEmailContent from './VerifyEmailContent';

export const metadata: Metadata = {
  title: 'Verify Your Email - VoiceoverStudioFinder',
  description: 'Please check your email to verify your account',
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ new?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const isNewProfile = params?.new === 'true';

  return <VerifyEmailContent isNewProfile={isNewProfile} />;
}