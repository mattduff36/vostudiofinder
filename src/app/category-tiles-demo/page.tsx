import { Metadata } from 'next';
import Link from 'next/link';
import { CategoryTileGrid } from '@/components/category/CategoryTileGrid';

export const metadata: Metadata = {
  title: 'Category Tiles Demo',
  robots: { index: false, follow: false },
};

export default function CategoryTilesDemoPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 text-center text-3xl font-bold" style={{ color: '#ffffff' }}>
          Category Tiles Demo
        </h1>
        <CategoryTileGrid />

        <nav className="mt-16 flex flex-col items-center gap-3">
          <p className="text-sm text-white/50">Hero layout demos:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/demo/hero-v1" className="text-sm text-white/70 hover:text-white underline transition-colors">V1 — Horizontal Strip</Link>
            <Link href="/demo/hero-v2" className="text-sm text-white/70 hover:text-white underline transition-colors">V2 — Category Cards</Link>
            <Link href="/demo/hero-v3" className="text-sm text-white/70 hover:text-white underline transition-colors">V3 — Tabbed Search</Link>
          </div>
        </nav>
      </div>
    </main>
  );
}
