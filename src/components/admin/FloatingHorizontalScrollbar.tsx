'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface FloatingHorizontalScrollbarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollContentRef: React.RefObject<HTMLTableElement | null>;
  onVisibilityChange?: (visible: boolean) => void;
  heightPx?: number;
}

function getIsOverflowing(container: HTMLDivElement, content: HTMLElement) {
  return content.scrollWidth > container.clientWidth + 1;
}

export default function FloatingHorizontalScrollbar({
  scrollContainerRef,
  scrollContentRef,
  onVisibilityChange,
  heightPx = 18,
}: FloatingHorizontalScrollbarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const isSyncingFromContainerRef = useRef(false);
  const isSyncingFromBarRef = useRef(false);
  const lastMeasuredWidthRef = useRef<number | null>(null);
  const lastMeasuredVisibleRef = useRef<boolean | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);

  const update = useMemo(() => {
    return () => {
      const container = scrollContainerRef.current;
      const content = scrollContentRef.current;
      if (!container || !content) return;

      const nextVisible = getIsOverflowing(container, content);
      const nextWidth = content.scrollWidth;

      if (lastMeasuredWidthRef.current !== nextWidth) {
        lastMeasuredWidthRef.current = nextWidth;
        setContentWidth(nextWidth);
      }

      if (lastMeasuredVisibleRef.current !== nextVisible) {
        lastMeasuredVisibleRef.current = nextVisible;
        setIsVisible(nextVisible);
      }

      // Keep bar in sync if it exists
      if (barRef.current && nextVisible) {
        barRef.current.scrollLeft = container.scrollLeft;
      }
    };
  }, [scrollContainerRef, scrollContentRef]);

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible, onVisibilityChange]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;
    if (!container || !content) return;

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(container);
    ro.observe(content);

    // Fallback for viewport changes that don't trigger RO in some browsers
    window.addEventListener('resize', update, { passive: true } as AddEventListenerOptions);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [scrollContainerRef, scrollContentRef, update]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const bar = barRef.current;
    if (!container || !bar || !isVisible) return;

    const onContainerScroll = () => {
      if (isSyncingFromBarRef.current) return;
      isSyncingFromContainerRef.current = true;
      bar.scrollLeft = container.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingFromContainerRef.current = false;
      });
    };

    const onBarScroll = () => {
      if (isSyncingFromContainerRef.current) return;
      isSyncingFromBarRef.current = true;
      container.scrollLeft = bar.scrollLeft;
      requestAnimationFrame(() => {
        isSyncingFromBarRef.current = false;
      });
    };

    container.addEventListener('scroll', onContainerScroll, { passive: true });
    bar.addEventListener('scroll', onBarScroll, { passive: true });

    // Initial sync
    bar.scrollLeft = container.scrollLeft;

    return () => {
      container.removeEventListener('scroll', onContainerScroll);
      bar.removeEventListener('scroll', onBarScroll);
    };
  }, [isVisible, scrollContainerRef]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div
        ref={barRef}
        className="overflow-x-auto overflow-y-hidden"
        style={{ height: `${heightPx}px` }}
        aria-label="Horizontal scroll"
      >
        <div style={{ width: `${contentWidth}px`, height: '1px' }} />
      </div>
    </div>
  );
}


