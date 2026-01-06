import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function RegisterRedirect() {
  const session = await getServerSession(authOptions);

  // Redirect if already authenticated
  if (session) {
    // Special redirect for admin@mpdee.co.uk
    if (session.user?.email === 'admin@mpdee.co.uk') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  // If not authenticated, redirect based on environment
  // In production, redirect to join waitlist
  // In development, redirect to signup form
  const destination = process.env.NODE_ENV === 'production' 
    ? '/join-waitlist' 
    : '/auth/signup';
  
  redirect(destination);
}










