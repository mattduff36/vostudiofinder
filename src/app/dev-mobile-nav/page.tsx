'use client';

import { useState, useRef } from 'react';
import { Home, Search, Menu, X } from 'lucide-react';
import { AdaptiveGlassBubblesNav, DEFAULT_CONFIG, type NavItem } from '@/components/navigation/AdaptiveGlassBubblesNav';

// Smaller button config for mobile nav (same as production)
const MOBILE_NAV_CONFIG = {
  ...DEFAULT_CONFIG,
  circleSize: 48,
  pillPaddingX: 10,
  pillPaddingY: 5,
};

// Animation timing constants - TWEAK THESE!
const MORPH_ANIMATION_MS = 600; // Text fade (200ms) + width collapse (400ms) 
const PAUSE_BEFORE_MENU_MS = 150; // Pause before menu opens
const TOTAL_MORPH_SEQUENCE_MS = MORPH_ANIMATION_MS + PAUSE_BEFORE_MENU_MS;

export default function DevMobileNavPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMenuHint, setShowMenuHint] = useState(true); // Always true for dev
  const [isMorphing, setIsMorphing] = useState(false);
  const [animationLog, setAnimationLog] = useState<string[]>([]);
  
  const logEvent = (event: string) => {
    const timestamp = Date.now();
    setAnimationLog(prev => [...prev, `${timestamp}: ${event}`]);
  };

  const handleMenuClick = () => {
    if (showMenuHint && !isMorphing) {
      logEvent('Click detected - starting morph sequence');
      setIsMorphing(true);
      
      // Log each phase
      setTimeout(() => logEvent('Text fade complete (200ms)'), 200);
      setTimeout(() => logEvent('Width collapse complete (600ms)'), MORPH_ANIMATION_MS);
      
      setTimeout(() => {
        logEvent('Full sequence complete - opening menu');
        setIsMorphing(false);
        setShowMenuHint(false);
        setIsMenuOpen(true);
      }, TOTAL_MORPH_SEQUENCE_MS);
    } else {
      setIsMenuOpen(!isMenuOpen);
    }
  };

  const resetAnimation = () => {
    setIsMenuOpen(false);
    setShowMenuHint(true);
    setIsMorphing(false);
    setAnimationLog([]);
  };

  // Keep "Open Menu" label during morphing so animation has content to fade
  const menuLabel = showMenuHint ? 'Open Menu' : (isMenuOpen ? 'Close' : 'Menu');
  // Keep showLabel true during morphing so pill structure is maintained
  const menuShowLabel = showMenuHint || isMorphing;

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      href: '/',
      showLabel: true,
    },
    {
      id: 'studios',
      label: 'Studios',
      icon: Search,
      href: '/studios',
      showLabel: true,
    },
    {
      id: 'menu',
      label: menuLabel,
      icon: isMenuOpen ? X : Menu,
      showLabel: menuShowLabel,
      isMorphing: isMorphing,
      onClick: handleMenuClick,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Dev: Mobile Nav Animation</h1>
        
        {/* Controls */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-4 space-y-4">
          <h2 className="text-lg font-semibold text-white">Controls</h2>
          
          <button
            onClick={resetAnimation}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Reset Animation
          </button>
          
          <div className="text-white/80 text-sm space-y-1">
            <p><strong>Current State:</strong></p>
            <p>showMenuHint: {showMenuHint ? 'true' : 'false'}</p>
            <p>isMorphing: {isMorphing ? 'true' : 'false'}</p>
            <p>isMenuOpen: {isMenuOpen ? 'true' : 'false'}</p>
          </div>
          
          <div className="text-white/80 text-sm space-y-1">
            <p><strong>Timing Constants:</strong></p>
            <p>MORPH_ANIMATION_MS: {MORPH_ANIMATION_MS}ms (fade 200ms + collapse 400ms)</p>
            <p>PAUSE_BEFORE_MENU_MS: {PAUSE_BEFORE_MENU_MS}ms</p>
            <p>TOTAL: {TOTAL_MORPH_SEQUENCE_MS}ms</p>
          </div>
        </div>
        
        {/* Animation Log */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-32 space-y-2">
          <h2 className="text-lg font-semibold text-white">Animation Log</h2>
          <div className="text-white/70 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
            {animationLog.length === 0 ? (
              <p>Click the menu button to see events...</p>
            ) : (
              animationLog.map((log, i) => <p key={i}>{log}</p>)
            )}
          </div>
        </div>
      </div>
      
      {/* Navigation - Fixed above the real nav */}
      <nav
        className="fixed bottom-[150px] left-0 right-0 z-50"
        style={{
          padding: '0 1rem 0 1rem',
        }}
      >
        <div className="mx-auto max-w-lg mb-[84px]">
          <AdaptiveGlassBubblesNav
            items={navItems}
            config={MOBILE_NAV_CONFIG}
            debugSensors={false}
            isPositioned={true}
            isVisible={true}
          />
        </div>
      </nav>
      
      {/* Menu Overlay (simple version) */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="absolute bottom-[200px] right-4 bg-white/20 backdrop-blur-xl rounded-2xl p-4 w-48"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white text-center">Menu Open!</p>
            <p className="text-white/60 text-sm text-center mt-2">Click outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
