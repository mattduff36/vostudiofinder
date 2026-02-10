'use client';

import { categoryTiles } from '@/lib/categoryTiles';
import { CategoryTileButton } from './CategoryTileButton';

export function CategoryTileGrid() {
  // Sort by row ascending, then column ascending
  const sorted = [...categoryTiles].sort((a, b) => {
    if (a.gridPosition.row !== b.gridPosition.row) {
      return a.gridPosition.row - b.gridPosition.row;
    }
    return a.gridPosition.column - b.gridPosition.column;
  });

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((tile) => (
        <CategoryTileButton key={tile.id} tile={tile} />
      ))}
    </div>
  );
}
