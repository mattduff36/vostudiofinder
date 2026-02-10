'use client';

import { categoryTiles } from '@/lib/categoryTiles';
import { CategoryTileButton } from '../CategoryTileButton';

const tile = categoryTiles.find((t) => t.id === 'voiceover-coach')!;

export function VoiceoverCoachTile() {
  return <CategoryTileButton tile={tile} />;
}
