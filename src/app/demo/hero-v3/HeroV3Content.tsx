'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EnhancedSearchBar } from '@/components/search/EnhancedSearchBar';
import { CategoryFilterBar } from '@/components/category/CategoryFilterBar';
import type { CategoryTile } from '@/lib/categoryTiles';

const PRIMARY = '#d42027';

export function HeroV3Content() {
  const router = useRouter();
  const [activeTile, setActiveTile] = useState<CategoryTile | null>(null);

  const handleCategorySelect = (tile: CategoryTile) => {
    setActiveTile((prev) => (prev?.id === tile.id ? null : tile));
  };

  const handleSearch = (
    location: string,
    coordinates?: { lat: number; lng: number },
    radius?: number,
  ) => {
    const params = new URLSearchParams();
    params.set('location', location);
    if (coordinates) {
      params.set('lat', coordinates.lat.toString());
      params.set('lng', coordinates.lng.toString());
    }
    if (radius) {
      params.set('radius', radius.toString());
    }
    if (activeTile) {
      params.set('studioTypes', activeTile.studioType);
    }
    router.push(`/studios?${params.toString()}`);
  };

  return (
    <div className="min-h-screen -mt-16 md:-mt-20 w-full bg-black">
      {/* ── Hero with tabs above search ──────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center text-white"
        style={{ minHeight: '70vh' }}
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
          <div className="absolute inset-0 bg-black/50" />
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
            Select a category, then search by location
          </p>

          {/* Category tabs */}
          <div className="mb-6 flex justify-center">
            <CategoryFilterBar
              variant="pill"
              onSelect={handleCategorySelect}
              activeId={activeTile?.id ?? null}
              className="justify-center flex-wrap gap-2"
            />
          </div>

          {/* Active category indicator */}
          {activeTile && (
            <p className="text-xs text-white/50 mb-4">
              Searching in:{' '}
              <span className="text-white font-medium">{activeTile.label}</span>
              <button
                type="button"
                className="ml-2 text-white/40 hover:text-white underline"
                onClick={() => setActiveTile(null)}
              >
                clear
              </button>
            </p>
          )}

          {/* Search bar */}
          <EnhancedSearchBar
            placeholder={
              activeTile
                ? `Search ${activeTile.label}s by location...`
                : 'Search by location, postcode, or username...'
            }
            showRadius={false}
            onSearch={handleSearch}
            className="max-w-2xl mx-auto"
          />

          {/* Browse all */}
          <div className="mt-6">
            <Link
              href="/studios"
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Browse all studios &rarr;
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
