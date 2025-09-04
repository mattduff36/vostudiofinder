'use client';

import { Session } from 'next-auth';
import { HeroSection } from './HeroSection';
import { FeaturedStudios } from './FeaturedStudios';
import { StatsSection } from './StatsSection';
import { CTASection } from './CTASection';
import { Footer } from './Footer';

interface HomePageProps {
  session: Session | null;
  featuredStudios: any[];
  stats: {
    totalStudios: number;
    totalUsers: number;
  };
}

export function HomePage({ session, featuredStudios, stats }: HomePageProps) {
  return (
    <div className="bg-white -mt-20">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Stats Section */}
      <StatsSection stats={stats} />
      
      {/* Featured Studios */}
      <FeaturedStudios studios={featuredStudios} />
      
      {/* Call to Action */}
      <CTASection session={session} />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
