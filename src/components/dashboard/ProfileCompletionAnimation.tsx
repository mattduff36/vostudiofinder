'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, Pencil } from 'lucide-react';

interface ProfileCompletionAnimationProps {
  children: ReactNode;
  shouldAnimate: boolean;
  onAnimationComplete: () => void;
}

/**
 * Animation wrapper for the profile completion widget (Desktop only)
 * 
 * Animation Sequence:
 * 1. Fade in at screen center (2x size) - 0.6s
 * 2. Pause with pulse glow and hints - 1.2s
 * 3. Move and shrink to final position - 0.8s
 * 4. Settle with link and pulsing text
 */
export function ProfileCompletionAnimation({
  children,
  shouldAnimate,
  onAnimationComplete,
}: ProfileCompletionAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<'initial' | 'center' | 'pause' | 'transition' | 'complete'>('initial');
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [finalPosition, setFinalPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!shouldAnimate || !mounted) {
      setAnimationPhase('complete');
      return;
    }

    // Start animation sequence
    const timers: NodeJS.Timeout[] = [];

    // Phase 1: Fade in at center (0.6s)
    timers.push(setTimeout(() => {
      setAnimationPhase('center');
    }, 100));

    // Phase 2: Pause with effects (1.2s)
    timers.push(setTimeout(() => {
      setAnimationPhase('pause');
    }, 700));

    // Phase 3: Transition to final position (0.8s)
    timers.push(setTimeout(() => {
      // Calculate final position before transitioning
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const finalX = rect.left + rect.width / 2;
        const finalY = rect.top + rect.height / 2;
        
        setFinalPosition({
          x: finalX - centerX,
          y: finalY - centerY,
        });
      }
      setAnimationPhase('transition');
    }, 1900));

    // Phase 4: Complete
    timers.push(setTimeout(() => {
      setAnimationPhase('complete');
      onAnimationComplete();
    }, 2700));

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [shouldAnimate, mounted, onAnimationComplete]);

  // Handle link click
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Scroll to the edit-profile section
    const editSection = document.getElementById('edit-profile');
    if (editSection) {
      editSection.scrollIntoView({ behavior: 'smooth' });
      // Update URL hash without triggering reload
      window.history.pushState(null, '', '/dashboard#edit-profile');
    } else {
      // Fallback: just update the hash
      window.location.hash = 'edit-profile';
    }
  };

  // Don't render anything during SSR
  if (!mounted) {
    return (
      <div ref={containerRef} className="relative flex items-center justify-center flex-shrink-0">
        {children}
      </div>
    );
  }

  // If not animating, render normally with Link wrapper and hover overlay
  if (!shouldAnimate || animationPhase === 'complete') {
    return (
      <div ref={containerRef} className="hidden md:block">
        <a
          href="/dashboard#edit-profile"
          onClick={handleClick}
          className="group relative flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full"
          aria-label="Edit your profile"
          style={{
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 30px 10px rgba(220, 38, 38, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {/* Original widget - hidden on hover */}
          <div className="group-hover:opacity-0 transition-opacity duration-300">
            {children}
          </div>
          
          {/* Hover overlay with icon and text - matches widget styling */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <Pencil className="w-10 h-10 text-gray-600 mb-1" aria-hidden="true" strokeWidth={1.5} />
            <span className="text-sm text-gray-600">Edit Profile</span>
          </div>
        </a>
      </div>
    );
  }

  // Animation phases - render in portal
  const animationContent = (
    <AnimatePresence>
      {(animationPhase === 'initial' || animationPhase === 'center' || animationPhase === 'pause' || animationPhase === 'transition') && (
        <motion.div
          className="fixed inset-0 z-[9999] pointer-events-none hidden md:flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop overlay */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

          {/* Animated widget container */}
          <motion.div
            className="relative pointer-events-auto"
            initial={{ 
              opacity: 0, 
              scale: 2,
            }}
            animate={
              animationPhase === 'center' || animationPhase === 'pause'
                ? { 
                    opacity: 1, 
                    scale: 2,
                    x: 0,
                    y: 0,
                  }
                : animationPhase === 'transition'
                ? {
                    opacity: 1,
                    scale: 1,
                    x: finalPosition.x,
                    y: finalPosition.y,
                  }
                : {}
            }
            transition={{
              duration: animationPhase === 'center' ? 0.6 : animationPhase === 'transition' ? 0.8 : 0.3,
              ease: [0.4, 0, 0.2, 1], // Custom easing for smooth motion
            }}
          >
            {/* Pulse glow effect during pause */}
            {animationPhase === 'pause' && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(220, 38, 38, 0)',
                    '0 0 30px 10px rgba(220, 38, 38, 0.3)',
                    '0 0 0 0 rgba(220, 38, 38, 0)',
                  ],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}

            {/* The actual widget */}
            <div className="relative">
              {children}
            </div>

            {/* Hand cursor icon - appears during pause */}
            {animationPhase === 'pause' && (
              <motion.div
                className="absolute -bottom-16 -right-16"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  scale: [0.5, 1, 1, 0.5],
                  rotate: [0, -10, 10, 0],
                }}
                transition={{
                  duration: 1.2,
                  times: [0, 0.2, 0.8, 1],
                  ease: 'easeInOut',
                }}
              >
                <MousePointer2 
                  className="w-12 h-12 drop-shadow-lg" 
                  style={{ 
                    color: 'white',
                    fill: 'white',
                    stroke: '#dc2626',
                    strokeWidth: '1'
                  }}
                />
              </motion.div>
            )}

            {/* Text hint - appears during pause */}
            {animationPhase === 'pause' && (
              <motion.div
                className="absolute -bottom-24 left-1/2 -translate-x-1/2 whitespace-nowrap"
                initial={{ opacity: 0, y: -10 }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  y: [-10, 0, 0, -10],
                }}
                transition={{
                  duration: 1.2,
                  times: [0, 0.2, 0.8, 1],
                  ease: 'easeInOut',
                }}
              >
                <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl text-lg font-medium">
                  Click to edit your profile
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Placeholder in the DOM for final position calculation */}
      <div ref={containerRef} className="hidden md:block opacity-0 pointer-events-none">
        {children}
      </div>

      {/* Portal for animation */}
      {typeof window !== 'undefined' && createPortal(animationContent, document.body)}
    </>
  );
}
