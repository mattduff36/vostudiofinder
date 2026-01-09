'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowRight, LayoutDashboard, Sparkles, Rocket, Zap, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface FloatingActionBarProps {
  completionPercentage: number;
  requiredFieldsCompleted: number;
  totalRequiredFields: number;
}

const ROTATING_MESSAGES = [
  {
    icon: Rocket,
    title: "Ready to launch your profile?",
    subtitle: "Complete your required fields and go live!"
  },
  {
    icon: Sparkles,
    title: "Your studio awaits!",
    subtitle: "Set up your profile and start attracting clients"
  },
  {
    icon: Target,
    title: "Get discovered by voice artists",
    subtitle: "Complete your profile to appear in search results"
  },
  {
    icon: Zap,
    title: "Quick setup, big impact!",
    subtitle: "Just 10 required fields to get your studio online"
  }
];

export function FloatingActionBar({
  completionPercentage,
  requiredFieldsCompleted,
  totalRequiredFields,
}: FloatingActionBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const { scrollY } = useScroll();
  
  // Show bar after scrolling down 300px
  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', updateVisibility);
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  // Rotate messages every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const opacity = useTransform(scrollY, [300, 400], [0, 1]);
  const currentMessage = ROTATING_MESSAGES[messageIndex];
  const MessageIcon = currentMessage.icon;

  return (
    <motion.div
      style={{ opacity }}
      initial={{ y: 100 }}
      animate={{ y: isVisible ? 0 : 100 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
    >
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <motion.div 
          className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl border-2 border-gray-200 p-4 md:p-6"
          style={{
            boxShadow: '0 -8px 24px -4px rgba(0, 0, 0, 0.12), 0 -4px 12px -2px rgba(0, 0, 0, 0.08), 0 8px 32px -8px rgba(0, 0, 0, 0.15)'
          }}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Rotating Message Content */}
            <div className="flex items-center gap-4 flex-1">
              {/* Animated Icon */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={messageIndex}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.5, type: 'spring' }}
                  className="hidden md:flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg"
                >
                  <MessageIcon className="w-7 h-7 text-white" />
                </motion.div>
              </AnimatePresence>

              {/* Animated Text */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={messageIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                      {currentMessage.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">
                      {currentMessage.subtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress Dots Indicator */}
              <div className="hidden md:flex items-center gap-2">
                {ROTATING_MESSAGES.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === messageIndex 
                        ? 'w-8 bg-red-600' 
                        : 'w-2 bg-gray-300'
                    }`}
                    animate={{
                      scale: index === messageIndex ? 1 : 0.8
                    }}
                  />
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full md:w-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold px-8 py-3 min-h-[52px] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group touch-manipulation"
                aria-label="Navigate to dashboard to complete your profile"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-extrabold">Go to Dashboard</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
