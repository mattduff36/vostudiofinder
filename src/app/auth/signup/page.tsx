import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Join Waitlist - VoiceoverStudioFinder',
  description: 'Join our waitlist to be notified when we launch',
};

export default async function SignupPage() {
  // Redirect to join-waitlist page during beta testing period
  redirect('/join-waitlist');
}
