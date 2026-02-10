'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { CategoryTile } from '@/lib/categoryTiles';

interface CategoryTileButtonProps {
  tile: CategoryTile;
}

export function CategoryTileButton({ tile }: CategoryTileButtonProps) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = `/assets/categories/${tile.id}.png`;

  return (
    <Link
      href={tile.href}
      aria-label={tile.ariaLabel}
      className={[
        'group relative block rounded-2xl overflow-hidden',
        'outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        // Hover & active transforms
        'motion-safe:transition-all motion-safe:duration-[220ms] motion-safe:ease-out',
        'motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02]',
        'motion-safe:active:scale-[0.98] motion-safe:active:translate-y-0',
        // Shadow / glow on hover
        'hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]',
      ].join(' ')}
    >
      {/* Image area */}
      <div
        className="relative aspect-[425/300] w-full overflow-hidden bg-transparent"
      >
        {imgError ? (
          /* Colored placeholder when image is missing */
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-lg font-semibold text-black/60 select-none">
              {tile.label}
            </span>
          </div>
        ) : (
          <Image
            src={imageSrc}
            alt={tile.label}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain motion-safe:transition-transform motion-safe:duration-[220ms] motion-safe:group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Label */}
      <div className="bg-black/80 px-4 py-3 text-center">
        <span className="text-sm font-semibold tracking-wide text-white">
          {tile.label}
        </span>
      </div>
    </Link>
  );
}
