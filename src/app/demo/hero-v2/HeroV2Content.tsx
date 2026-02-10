'use client';

import Image from 'next/image';
import Link from 'next/link';
import { EnhancedSearchBar } from '@/components/search/EnhancedSearchBar';
import { CategoryTileGrid } from '@/components/category/CategoryTileGrid';

const PRIMARY = '#d42027';

export function HeroV2Content() {
  return (
    <div className="min-h-screen -mt-16 md:-mt-20 w-full bg-black">
      {/* ── Full hero with embedded grid ─────────────────────── */}
      <section className="relative flex flex-col items-center text-white">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/bottom-banner.jpg"
            alt="Professional recording studio"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16">
          {/* Heading */}
          <div className="text-center mb-8">
            <h1
              className="hp1 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 leading-tight"
              style={{ color: '#ffffff' }}
            >
              Find a{' '}
              <span style={{ color: PRIMARY }}>Voiceover Recording Studio</span>
            </h1>
            <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto">
              Professional Voiceover, Podcast &amp; Recording Studios Worldwide
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <EnhancedSearchBar
              placeholder="Search by location, postcode, or username..."
              showRadius={false}
            />
          </div>

          {/* Category tile grid */}
          <div className="max-w-4xl mx-auto">
            <CategoryTileGrid />
          </div>

          {/* Browse all link */}
          <div className="text-center mt-8">
            <Link
              href="/studios"
              className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
            >
              or browse all studios
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Placeholder content below ────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-white/40 text-center text-sm">
          Content below the fold (featured studios, stats, CTAs) would go here.
        </p>
      </section>
    </div>
  );
}
