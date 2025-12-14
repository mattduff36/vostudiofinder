'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeaturedStudioRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page
    router.push('/#featured-studios');
    
    // Fallback: if hash navigation doesn't work, scroll after a brief delay
    setTimeout(() => {
      const featuredSection = document.getElementById('featured-studios');
      if (featuredSection) {
        featuredSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 500);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Featured Studios...</p>
      </div>
    </div>
  );
}
