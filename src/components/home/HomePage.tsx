'use client';

import { Session } from 'next-auth';
import { HeroSection } from './HeroSection';
import { FeaturedStudios } from './FeaturedStudios';
import { StatsSection } from './StatsSection';
import { CTASection } from './CTASection';
import { Footer } from './Footer';

// New color palette
export const colors = {
  primary: '#d42027',
  primaryHover: '#a1181d',
  background: '#ffffff',
  textPrimary: '#000000',
  textSecondary: '#444444',
  textSubtle: '#888888',
};

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
    <div className="min-h-screen -mt-20" style={{ backgroundColor: colors.background }}>
      {/* Hero Section */}
      <HeroSection />
      
      {/* Featured Studios */}
      <FeaturedStudios studios={featuredStudios} />
      
      {/* Stats Section */}
      <StatsSection stats={stats} />
      
      {/* Call to Action */}
      <CTASection session={session} />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
