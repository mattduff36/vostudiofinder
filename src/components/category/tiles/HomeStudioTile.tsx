'use client';

import { categoryTiles } from '@/lib/categoryTiles';
import { CategoryTileButton } from '../CategoryTileButton';

const tile = categoryTiles.find((t) => t.id === 'home-studio')!;

export function HomeStudioTile() {
  return <CategoryTileButton tile={tile} />;
}
