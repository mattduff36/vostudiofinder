'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { categoryTiles } from '@/lib/categoryTiles';
import type { CategoryTile } from '@/lib/categoryTiles';

type Variant = 'compact' | 'pill' | 'card';
type Tone = 'dark' | 'light';
type LabelMode = 'full' | 'short';

interface CategoryFilterBarProps {
  /** Visual variant: 'compact' (small icons), 'pill' (image+label inline), 'card' (larger thumbnails) */
  variant?: Variant;
  /** Color tone: 'dark' (white text on dark bg) or 'light' (dark text on light bg) */
  tone?: Tone;
  /** Label mode: 'full' uses JSON labels, 'short' uses navbar-style labels */
  labelMode?: LabelMode;
  /** Multiply image size (e.g. 2 for 200%) */
  imageScale?: number;
  /** If provided, renders buttons that call onSelect instead of links */
  onSelect?: (tile: CategoryTile) => void;
  /** Currently active tile id (for highlighting) */
  activeId?: string | null;
  /** Additional className for the outer wrapper */
  className?: string;
  /** Enable Mac OS dock-style magnification (items start 25% smaller, grow on hover) */
  dockEffect?: boolean;
}

const DOCK_REST = 0.7;
const DOCK_HOVER = 1.0;
const DOCK_NEIGHBOR_1 = 0.8;

function getDockScale(hoveredIdx: number | null, itemIdx: number): number {
  if (hoveredIdx === null) return DOCK_REST;
  const dist = Math.abs(itemIdx - hoveredIdx);
  if (dist === 0) return DOCK_HOVER;
  if (dist === 1) return DOCK_NEIGHBOR_1;
  return DOCK_REST;
}

export function CategoryFilterBar({
  variant = 'compact',
  tone = 'dark',
  labelMode = 'full',
  imageScale = 1,
  onSelect,
  activeId,
  className = '',
  dockEffect = false,
}: CategoryFilterBarProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const onItemEnter = useCallback((idx: number) => setHoveredIdx(idx), []);
  const onItemLeave = useCallback(() => setHoveredIdx(null), []);

  const sorted = [...categoryTiles].sort((a, b) => {
    if (a.gridPosition.row !== b.gridPosition.row) return a.gridPosition.row - b.gridPosition.row;
    return a.gridPosition.column - b.gridPosition.column;
  });

  const handleImgError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const isActive = (id: string) => activeId === id;

  // ── Variant-specific styles ──────────────────────────────────────

  // Base styles that vary by tone
  const getBaseClasses = (variantType: Variant): string => {
    const isDark = tone === 'dark';
    const hoverBg = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';
    const focusRing = isDark
      ? 'focus-visible:ring-white focus-visible:ring-offset-black'
      : 'focus-visible:ring-gray-400 focus-visible:ring-offset-white';

    const baseClasses = [
      'group cursor-pointer select-none',
      ...(dockEffect
        ? ['transition-[transform,margin] duration-200 ease-out']
        : [
            'motion-safe:transition-all motion-safe:duration-[220ms] motion-safe:ease-out',
            'motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02]',
            'motion-safe:active:scale-[0.98] motion-safe:active:translate-y-0',
          ]),
      hoverBg,
      `outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRing}`,
      isDark ? 'hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]' : 'hover:shadow-lg hover:shadow-black/10',
    ];

    if (variantType === 'compact') {
      const padding = dockEffect ? 'px-3 pt-0 pb-1' : 'px-3 py-2';
      return [...baseClasses, `flex flex-col items-center gap-1.5 ${padding} min-w-[72px] rounded-xl`].join(' ');
    } else if (variantType === 'pill') {
      const borderColor = isDark ? 'border-white/20' : 'border-gray-300';
      const hoverBorder = isDark ? 'hover:border-white/40' : 'hover:border-gray-400';
      return [...baseClasses, `flex items-center gap-2.5 px-4 py-2 min-w-max rounded-full border ${borderColor} ${hoverBorder}`].join(' ');
    } else {
      return [...baseClasses, 'flex flex-col items-center gap-2 px-4 py-3 min-w-[120px] rounded-2xl'].join(' ');
    }
  };

  const itemClasses: Record<Variant, string> = {
    compact: getBaseClasses('compact'),
    pill: getBaseClasses('pill'),
    card: getBaseClasses('card'),
  };

  const getActiveClasses = (variantType: Variant): string => {
    const isDark = tone === 'dark';
    if (variantType === 'compact') {
      return isDark ? 'border-b-2 border-white bg-white/5' : 'border-b-2 border-gray-700 bg-gray-100';
    } else if (variantType === 'pill') {
      return isDark
        ? 'bg-white/15 border-white/60 ring-1 ring-white/30'
        : 'bg-gray-200 border-gray-500 ring-1 ring-gray-300';
    } else {
      return isDark ? 'bg-white/10 ring-1 ring-white/30' : 'bg-gray-100 ring-1 ring-gray-300';
    }
  };

  const activeClasses: Record<Variant, string> = {
    compact: getActiveClasses('compact'),
    pill: getActiveClasses('pill'),
    card: getActiveClasses('card'),
  };

  const imageSize: Record<Variant, { w: number; h: number }> = {
    compact: { w: 48, h: 34 },
    pill: { w: 36, h: 26 },
    card: { w: 80, h: 56 },
  };

  // ── Render helpers ───────────────────────────────────────────────

  const renderImage = (tile: CategoryTile) => {
    const base = imageSize[variant];
    const size = {
      w: Math.max(1, Math.round(base.w * imageScale)),
      h: Math.max(1, Math.round(base.h * imageScale)),
    };
    const src = `/assets/categories/${tile.id}.png`;

    if (imgErrors[tile.id]) {
      return (
        <div
          className="rounded-lg flex items-center justify-center"
          style={{ width: `${size.w}px`, height: `${size.h}px`, backgroundColor: tile.backgroundColor }}
        >
          <span className="text-[10px] font-medium text-black/50">{tile.label[0]}</span>
        </div>
      );
    }

    return (
      <Image
        src={src}
        alt={tile.label}
        width={size.w}
        height={size.h}
        className="object-contain"
        onError={() => handleImgError(tile.id)}
      />
    );
  };

  const renderLabel = (tile: CategoryTile) => {
    const sizeClass = variant === 'compact' ? 'text-[11px]' : variant === 'pill' ? 'text-xs' : 'text-sm';
    const isDark = tone === 'dark';
    const textColor = isDark ? 'text-white/80' : 'text-gray-700';
    const activeTextColor = isDark ? 'text-white' : 'text-gray-900';

    const shortLabelById: Record<string, string> = {
      'home-studio': 'Home',
      'recording-studio': 'Recording',
      'podcast-studio': 'Podcast',
      'voiceover-artist': 'Voiceover',
      'audio-producer': 'Producer',
      'voiceover-coach': 'Coach',
    };

    const label = labelMode === 'short' ? (shortLabelById[tile.id] ?? tile.label) : tile.label;
    
    return (
      <span
        className={`${sizeClass} font-medium ${textColor} whitespace-nowrap ${
          isActive(tile.id) ? activeTextColor : ''
        }`}
      >
        {label}
      </span>
    );
  };

  const renderItem = (tile: CategoryTile, index: number) => {
    const active = isActive(tile.id);
    const cls = [itemClasses[variant], active ? activeClasses[variant] : ''].join(' ');
    const baseMinWidth = variant === 'compact' ? Math.round(72 * imageScale) : undefined;

    const dockScale = dockEffect ? getDockScale(hoveredIdx, index) : undefined;
    const dockMargin = dockScale != null ? (dockScale - 1) * 32 : 0;
    const itemStyle: React.CSSProperties = {
      ...(baseMinWidth != null ? { minWidth: `${baseMinWidth}px` } : {}),
      ...(dockScale != null
        ? {
            transform: `scale(${dockScale})${dockScale === DOCK_HOVER ? ' translateY(-2px)' : ''}`,
            transformOrigin: 'bottom center',
            marginLeft: `${dockMargin}px`,
            marginRight: `${dockMargin}px`,
          }
        : {}),
    };

    const dockHandlers = dockEffect
      ? { onMouseEnter: () => onItemEnter(index), onMouseLeave: onItemLeave }
      : {};

    const inner = (
      <>
        {renderImage(tile)}
        {renderLabel(tile)}
      </>
    );

    if (onSelect) {
      return (
        <button
          key={tile.id}
          type="button"
          aria-label={tile.ariaLabel}
          aria-pressed={active}
          className={cls}
          style={itemStyle}
          onClick={() => onSelect(tile)}
          {...dockHandlers}
        >
          {inner}
        </button>
      );
    }

    return (
      <Link key={tile.id} href={tile.href} aria-label={tile.ariaLabel} className={cls} style={itemStyle} {...dockHandlers}>
        {inner}
      </Link>
    );
  };

  // ── Outer container ──────────────────────────────────────────────

  return (
    <div
      className={`flex items-end ${dockEffect ? 'gap-0' : 'gap-1'} overflow-x-auto scrollbar-hide ${className}`}
      role="tablist"
      aria-label="Studio categories"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      {...(dockEffect ? { onMouseLeave: onItemLeave } : {})}
    >
      {sorted.map((tile, i) => renderItem(tile, i))}
    </div>
  );
}
