import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function RegisterRedirect() {
  const session = await getServerSession(authOptions);

  // Redirect if already authenticated
  if (session) {
    redirect('/dashboard');
  }

  // If not authenticated, redirect to signup
  redirect('/auth/signup');
}










