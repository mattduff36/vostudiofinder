'use client';

import { categoryTiles } from '@/lib/categoryTiles';
import { CategoryTileButton } from '../CategoryTileButton';

const tile = categoryTiles.find((t) => t.id === 'voiceover-artist')!;

export function VoiceoverArtistTile() {
  return <CategoryTileButton tile={tile} />;
}
