'use client';

import { categoryTiles } from '@/lib/categoryTiles';
import { CategoryTileButton } from '../CategoryTileButton';

const tile = categoryTiles.find((t) => t.id === 'recording-studio')!;

export function RecordingStudioTile() {
  return <CategoryTileButton tile={tile} />;
}
