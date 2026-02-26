'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Mail } from 'lucide-react';

interface UserEditProfileFloatingButtonProps {
  onClick: () => void;
  onMessageClick?: () => void;
}

export function UserEditProfileFloatingButton({ onClick, onMessageClick }: UserEditProfileFloatingButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setTimeout(() => setIsPulsing(true), 500);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="hidden md:flex fixed top-20 right-6 z-50 flex-col gap-2 items-end">
          {onMessageClick && (
            <button
              onClick={onMessageClick}
              className="flex items-center gap-2 px-4 py-2 bg-[#d42027] text-white text-sm rounded-full font-medium shadow-lg hover:bg-[#a1181d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:ring-offset-2 opacity-50"
              aria-label="Message as admin"
            >
              <Mail className="w-4 h-4" />
              <span>Message As Admin</span>
            </button>
          )}

          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 0.5, 
              scale: 1, 
              y: 0,
              boxShadow: isPulsing 
                ? [
                    '0 4px 20px rgba(212, 32, 39, 0.3)',
                    '0 8px 30px rgba(212, 32, 39, 0.5)',
                    '0 4px 20px rgba(212, 32, 39, 0.3)',
                  ]
                : '0 4px 20px rgba(212, 32, 39, 0.3)',
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              boxShadow: {
                duration: 2,
                repeat: isPulsing ? Infinity : 0,
                ease: 'easeInOut',
              }
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 8px 30px rgba(212, 32, 39, 0.5)',
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            onMouseEnter={() => setIsPulsing(false)}
            className="flex items-center gap-2 px-4 py-2 bg-[#d42027] text-white text-sm rounded-full font-medium shadow-lg hover:bg-[#a1181d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#d42027] focus:ring-offset-2"
            aria-label="Edit as admin"
          >
            <Pencil className="w-4 h-4" />
            <span>Edit As Admin</span>
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
