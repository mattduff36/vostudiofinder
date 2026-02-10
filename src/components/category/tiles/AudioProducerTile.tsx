'use client';

import { categoryTiles } from '@/lib/categoryTiles';
import { CategoryTileButton } from '../CategoryTileButton';

const tile = categoryTiles.find((t) => t.id === 'audio-producer')!;

export function AudioProducerTile() {
  return <CategoryTileButton tile={tile} />;
}
