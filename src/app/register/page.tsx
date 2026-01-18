import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function RegisterRedirect() {
  const session = await getServerSession(authOptions);

  // Redirect if already authenticated
  if (session) {
    redirect('/dashboard');
  }

  // If not authenticated, redirect based on environment
  // In production, redirect to join waitlist
  // In preview/development, redirect to signup form
  // VERCEL_ENV is set by Vercel: 'development' | 'preview' | 'production'
  // If VERCEL_ENV is undefined (local dev), show signup form
  const destination = process.env.VERCEL_ENV === 'production' 
    ? '/join-waitlist' 
    : '/auth/signup';
  
  redirect(destination);
}










