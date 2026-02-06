'use client';

import { motion } from 'framer-motion';

const springTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 15,
  mass: 0.8,
};

/**
 * FREE badge component with pop-in animation.
 * - `small` (navbar/mobile): animates on mount after 2s delay
 * - default (homepage CTAs): animates when scrolled into view after 2s delay, slightly larger
 */
export function FreeBadge({ small }: { small?: boolean }) {
  const initial = { opacity: 0, scale: 0, rotate: -20 };
  const visible = { opacity: 1, scale: 1, rotate: 10 };

  if (small) {
    // Navbar / mobile: animate immediately on mount
    return (
      <motion.span
        className="absolute bg-yellow-500 text-white text-[11px] font-bold leading-none px-2 py-[3px] rounded-full pointer-events-none"
        style={{ top: '-6px', right: '-6px' }}
        initial={initial}
        animate={visible}
        transition={{ delay: 2, ...springTransition }}
      >
        FREE
      </motion.span>
    );
  }

  // Homepage CTAs: viewport-triggered, proportionally larger badge
  return (
    <motion.span
      className="absolute bg-yellow-500 text-white text-[13px] font-bold leading-none px-2.5 py-[4px] rounded-full pointer-events-none"
      style={{ top: '-4px', right: '-8px', rotate: 10 }}
      initial={initial}
      whileInView={visible}
      viewport={{ once: true, amount: 1.0 }}
      transition={{ delay: 2, ...springTransition }}
    >
      FREE
    </motion.span>
  );
}
