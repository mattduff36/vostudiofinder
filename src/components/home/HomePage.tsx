'use client';

import { Session } from 'next-auth';
import { HeroSection } from './HeroSection';
import { FeaturedStudios } from './FeaturedStudios';
import { CombinedCTASection } from './CombinedCTASection';
import { NewCTASection } from './NewCTASection';
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
    totalCountries: number;
  };
  /** Server-side promo state from database */
  isPromoActive?: boolean;
}

export function HomePage({ session, featuredStudios, stats, isPromoActive = false }: HomePageProps) {
  return (
    <div className="min-h-screen -mt-16 md:-mt-20 w-full max-w-full overflow-x-hidden flex flex-col" style={{ backgroundColor: colors.background }}>
      <div className="flex-1">
        {/* Hero Section */}
        <HeroSection isPromoActive={isPromoActive} />
        
        {/* Featured Studios */}
        <FeaturedStudios studios={featuredStudios} session={session} />
        
        {/* Combined Stats and CTA Section */}
        <CombinedCTASection session={session} stats={stats} isPromoActive={isPromoActive} />
        
        {/* New CTA Section */}
        <NewCTASection isPromoActive={isPromoActive} />
      </div>
      
      {/* Footer - Desktop only */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
