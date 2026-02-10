'use client';

import Image from 'next/image';
import { EnhancedSearchBar } from '@/components/search/EnhancedSearchBar';
import { CategoryFilterBar } from '@/components/category/CategoryFilterBar';

const PRIMARY = '#d42027';

export function HeroV1Content() {
  return (
    <div className="min-h-screen -mt-16 md:-mt-20 w-full bg-black">
      {/* ── Hero section ─────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-white"
        style={{ minHeight: '60vh' }}
      >
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/bottom-banner.jpg"
            alt="Professional recording studio"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16 text-center">
          <h1
            className="hp1 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight"
            style={{ color: '#ffffff' }}
          >
            Find a{' '}
            <span style={{ color: PRIMARY }}>Voiceover Recording Studio</span>
          </h1>

          <p className="text-sm sm:text-base text-white/70 mb-8 max-w-xl mx-auto">
            Professional Voiceover, Podcast &amp; Recording Studios Worldwide
          </p>

          <EnhancedSearchBar
            placeholder="Search by location, postcode, or username..."
            showRadius={false}
            className="max-w-2xl mx-auto"
          />
        </div>
      </section>

      {/* ── Category strip (Airbnb-style) ────────────────────── */}
      <section className="w-full border-b border-white/10 bg-black/90 backdrop-blur-sm sticky top-14 md:top-20 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <CategoryFilterBar variant="compact" />
        </div>
      </section>

      {/* ── Placeholder content below ────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-white/40 text-center text-sm">
          Content below the fold (featured studios, etc.) would go here.
        </p>
      </section>
    </div>
  );
}
