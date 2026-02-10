'use client';

import { categoryTiles } from '@/lib/categoryTiles';
import { CategoryTileButton } from '../CategoryTileButton';

const tile = categoryTiles.find((t) => t.id === 'podcast-studio')!;

export function PodcastStudioTile() {
  return <CategoryTileButton tile={tile} />;
}
