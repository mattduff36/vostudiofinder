'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  hover?: boolean;
  delay?: number;
  className?: string;
}

/**
 * AnimatedCard - Reusable card wrapper with Framer Motion animations
 * Applies consistent styling from the success page to dashboard cards
 * DESKTOP ONLY - Wrap in hidden md:block when using
 */
export function AnimatedCard({
  children,
  hover = true,
  delay = 0,
  className = '',
  ...motionProps
}: AnimatedCardProps) {
  const baseClasses = 'bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-2xl';
  const combinedClasses = `${baseClasses} ${className}`.trim();

  const hoverAnimation = hover
    ? {
        y: -4,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        transition: { duration: 0.3 }
      }
    : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: 'easeOut'
      }}
      {...(hover && { whileHover: hoverAnimation })}
      className={combinedClasses}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCardSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * AnimatedCardSection - Section wrapper within an AnimatedCard
 * For organizing content within cards
 */
export function AnimatedCardSection({
  children,
  className = '',
}: AnimatedCardSectionProps) {
  return (
    <div className={`p-6 ${className}`.trim()}>
      {children}
    </div>
  );
}

interface AnimatedCardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * AnimatedCardHeader - Consistent header styling for cards
 * Includes title, optional subtitle, and optional action button/element
 */
export function AnimatedCardHeader({
  title,
  subtitle,
  action,
  className = '',
}: AnimatedCardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`.trim()}>
      <div>
        <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
