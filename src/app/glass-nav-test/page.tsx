'use client';

import { useState } from 'react';
import { Session } from 'next-auth';

// Import all glass nav implementations
import { IOSGlassNav } from '@/components/glass-nav-examples/IOSGlassNav';
import { YouTubeGlassNav } from '@/components/glass-nav-examples/YouTubeGlassNav';
import { FloatingPillGlassNav } from '@/components/glass-nav-examples/FloatingPillGlassNav';
import { FramerGlassNav } from '@/components/glass-nav-examples/FramerGlassNav';
import { MinimalGlassNav } from '@/components/glass-nav-examples/MinimalGlassNav';
import { AceternityGlassNav } from '@/components/glass-nav-examples/AceternityGlassNav';
import { LiquidGlassNav1 } from '@/components/glass-nav-examples/LiquidGlassNav1';
import { LiquidGlassNav2 } from '@/components/glass-nav-examples/LiquidGlassNav2';
import { VisionOSGlassNav } from '@/components/glass-nav-examples/VisionOSGlassNav';
import { GlassUINav } from '@/components/glass-nav-examples/GlassUINav';
import { GlassCNNav } from '@/components/glass-nav-examples/GlassCNNav';
import { AdaptiveGlassNav } from '@/components/glass-nav-examples/AdaptiveGlassNav';

type NavMode = 'static' | 'auto-hide' | 'minimal';
type Implementation = 'ios' | 'youtube' | 'floating' | 'framer' | 'minimal-lib' | 'aceternity' | 
  'liquid1' | 'liquid2' | 'visionos' | 'glassui' | 'glasscn' | 'adaptive';

// Mock session for testing (since this is a test page)
const mockSession: Session = {
  user: {
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
  },
  expires: '2025-12-31',
};

export default function GlassNavTestPage() {
  const [mode, setMode] = useState<NavMode>('static');
  const [implementation, setImplementation] = useState<Implementation>('adaptive');
  const [showComparison, setShowComparison] = useState(false);
  const [background, setBackground] = useState<'white' | 'black' | 'gradient' | 'color' | 'image'>('gradient');

  const implementations = [
    { id: 'adaptive', name: '🌟 Adaptive Glass', description: 'Auto-adapts to light/dark content behind it', category: 'Premium Libraries' },
    { id: 'liquid1', name: 'Liquid Glass v1', description: '@specy/liquid-glass-react with high intensity', category: 'Premium Libraries' },
    { id: 'liquid2', name: 'Liquid Glass v2', description: 'Dynamic pill style with liquid effects', category: 'Premium Libraries' },
    { id: 'visionos', name: 'visionOS Style', description: 'Apple visionOS inspired with specular highlights', category: 'Premium Libraries' },
    { id: 'glassui', name: 'Glass UI', description: 'Classic glassmorphism principles', category: 'Premium Libraries' },
    { id: 'glasscn', name: 'glasscn-ui', description: 'shadcn/ui inspired glass components', category: 'Premium Libraries' },
    { id: 'ios', name: 'iOS Style', description: 'Multi-layer blur with subtle shadows', category: 'Custom CSS' },
    { id: 'youtube', name: 'YouTube Dark', description: 'Dark frosted glass with depth', category: 'Custom CSS' },
    { id: 'floating', name: 'Floating Pill', description: 'Rounded island with dynamic shadows', category: 'Custom CSS' },
    { id: 'framer', name: 'Framer Motion', description: 'Smooth spring animations', category: 'Custom CSS' },
    { id: 'minimal-lib', name: 'Minimal Glass', description: 'Clean expandable design', category: 'Custom CSS' },
    { id: 'aceternity', name: 'Aceternity UI', description: 'Premium glass components', category: 'Custom CSS' },
  ] as const;

  const getBackgroundClass = (bg: typeof background) => {
    switch (bg) {
      case 'white':
        return 'bg-white';
      case 'black':
        return 'bg-gray-900';
      case 'gradient':
        return 'bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100';
      case 'color':
        return 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500';
      case 'image':
        return 'bg-pattern';
      default:
        return 'bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100';
    }
  };

  const renderNav = (impl: Implementation, testMode: NavMode) => {
    const commonProps = {
      mode: testMode,
      session: mockSession,
      onMenuClick: () => alert('Menu clicked!'),
    };

    switch (impl) {
      case 'adaptive':
        return <AdaptiveGlassNav {...commonProps} />;
      case 'liquid1':
        return <LiquidGlassNav1 {...commonProps} />;
      case 'liquid2':
        return <LiquidGlassNav2 {...commonProps} />;
      case 'visionos':
        return <VisionOSGlassNav {...commonProps} />;
      case 'glassui':
        return <GlassUINav {...commonProps} />;
      case 'glasscn':
        return <GlassCNNav {...commonProps} />;
      case 'ios':
        return <IOSGlassNav {...commonProps} />;
      case 'youtube':
        return <YouTubeGlassNav {...commonProps} />;
      case 'floating':
        return <FloatingPillGlassNav {...commonProps} />;
      case 'framer':
        return <FramerGlassNav {...commonProps} />;
      case 'minimal-lib':
        return <MinimalGlassNav {...commonProps} />;
      case 'aceternity':
        return <AceternityGlassNav {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Premium Glass Navigation Test
          </h1>
          <p className="text-sm text-gray-600">
            Test different glassmorphism implementations with various interaction modes
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Mode Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interaction Mode</h2>
          <div className="flex gap-3">
            {(['static', 'auto-hide', 'minimal'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  mode === m
                    ? 'bg-[#d42027] text-white shadow-lg shadow-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {m === 'static' && 'Static'}
                {m === 'auto-hide' && 'Auto-hide'}
                {m === 'minimal' && 'Minimal'}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {mode === 'static' && 'Always visible with click animations'}
            {mode === 'auto-hide' && 'Hides on scroll down, shows on scroll up'}
            {mode === 'minimal' && 'Single button that expands to show others'}
          </p>
        </div>

        {/* Implementation Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Glass Style</h2>
          
          {/* Premium Libraries Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#d42027] mb-3 uppercase tracking-wide">
              ⭐ Premium Libraries
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {implementations.filter(impl => impl.category === 'Premium Libraries').map((impl) => (
                <button
                  key={impl.id}
                  onClick={() => setImplementation(impl.id as Implementation)}
                  className={`p-4 rounded-lg text-left transition-all border-2 ${
                    implementation === impl.id
                      ? 'border-[#d42027] bg-red-50 shadow-lg shadow-red-100'
                      : 'border-gray-200 bg-white hover:border-[#d42027]/30 hover:shadow-md'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{impl.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{impl.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom CSS Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              Custom CSS Implementations
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {implementations.filter(impl => impl.category === 'Custom CSS').map((impl) => (
                <button
                  key={impl.id}
                  onClick={() => setImplementation(impl.id as Implementation)}
                  className={`p-4 rounded-lg text-left transition-all border-2 ${
                    implementation === impl.id
                      ? 'border-[#d42027] bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{impl.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{impl.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Background Selector */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Background Style</h2>
          <div className="flex gap-3 flex-wrap">
            {(['white', 'black', 'gradient', 'color', 'image'] as const).map((bg) => (
              <button
                key={bg}
                onClick={() => setBackground(bg)}
                className={`px-6 py-3 rounded-lg font-medium transition-all border-2 ${
                  background === bg
                    ? 'border-[#d42027] bg-red-50 text-[#d42027]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {bg === 'white' && '⚪ White'}
                {bg === 'black' && '⚫ Black'}
                {bg === 'gradient' && '🌈 Gradient'}
                {bg === 'color' && '🎨 Colored'}
                {bg === 'image' && '🖼️ Image/Pattern'}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Test how glass effects look on different backgrounds
          </p>
        </div>

        {/* Comparison Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-[#d42027] focus:ring-[#d42027]"
            />
            <span className="font-medium text-gray-900">
              Show Comparison View (Side by Side)
            </span>
          </label>
        </div>
      </div>

      {/* Preview Area */}
      <div className="max-w-7xl mx-auto px-4 pb-32">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className={`relative ${getBackgroundClass(background)}`}>
            {showComparison ? (
              <div className="grid grid-cols-2 gap-4 p-4">
                {/* Left side - Current implementation */}
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 min-h-[600px] relative border border-white/60">
                  <div className="text-center mb-4 text-sm font-medium text-gray-700">
                    {implementations.find((i) => i.id === implementation)?.name}
                  </div>
                  <div className="absolute inset-0">
                    {/* Fake content for scrolling */}
                    <div className="p-6 space-y-4 overflow-y-auto h-full">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="bg-white/80 rounded-lg p-4 shadow-sm">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                    {renderNav(implementation, mode)}
                  </div>
                </div>
                {/* Right side - Next implementation for comparison */}
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 min-h-[600px] relative border border-white/60">
                  <div className="text-center mb-4 text-sm font-medium text-gray-700">
                    {
                      implementations.find(
                        (i) =>
                          i.id ===
                          implementations[
                            (implementations.findIndex((im) => im.id === implementation) + 1) %
                              implementations.length
                          ].id
                      )?.name
                    }
                  </div>
                  <div className="absolute inset-0">
                    <div className="p-6 space-y-4 overflow-y-auto h-full">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="bg-white/80 rounded-lg p-4 shadow-sm">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                    {renderNav(
                      implementations[
                        (implementations.findIndex((im) => im.id === implementation) + 1) %
                          implementations.length
                      ].id as Implementation,
                      mode
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative min-h-[80vh]">
                {/* Fake content for scrolling test */}
                <div className="p-6 space-y-4">
                  <div className="text-center py-8">
                    <h3 className={`text-2xl font-bold mb-2 ${
                      background === 'black' ? 'text-white' : 
                      background === 'color' ? 'text-white' : 
                      'text-gray-800'
                    }`}>
                      {implementations.find((i) => i.id === implementation)?.name}
                    </h3>
                    <p className={`${
                      background === 'black' ? 'text-gray-300' : 
                      background === 'color' ? 'text-white/90' : 
                      'text-gray-600'
                    }`}>
                      {implementations.find((i) => i.id === implementation)?.description}
                    </p>
                    <p className={`text-sm mt-2 ${
                      background === 'black' ? 'text-gray-400' : 
                      background === 'color' ? 'text-white/80' : 
                      'text-gray-500'
                    }`}>
                      Mode: <span className="font-semibold capitalize">{mode}</span> | 
                      Background: <span className="font-semibold capitalize">{background}</span>
                    </p>
                  </div>

                  {/* Background-specific content cards */}
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`rounded-xl p-6 shadow-sm ${
                        background === 'white' ? 'bg-gray-50 border border-gray-200' :
                        background === 'black' ? 'bg-white/10 backdrop-blur-sm border border-white/20' :
                        background === 'color' ? 'bg-white/20 backdrop-blur-md border border-white/30' :
                        background === 'image' ? 'bg-white/70 backdrop-blur-md border border-white/40' :
                        'bg-white/80 backdrop-blur-sm'
                      }`}
                    >
                      <div className={`h-5 rounded w-3/4 mb-3 ${
                        background === 'black' || background === 'color' ? 'bg-white/30' : 'bg-gray-200'
                      }`}></div>
                      <div className={`h-4 rounded w-full mb-2 ${
                        background === 'black' || background === 'color' ? 'bg-white/20' : 'bg-gray-100'
                      }`}></div>
                      <div className={`h-4 rounded w-5/6 ${
                        background === 'black' || background === 'color' ? 'bg-white/20' : 'bg-gray-100'
                      }`}></div>
                    </div>
                  ))}
                </div>

                {/* Render the selected navigation */}
                {renderNav(implementation, mode)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="fixed top-20 right-4 max-w-xs bg-white rounded-lg shadow-lg p-4 border border-gray-200 hidden lg:block">
        <h3 className="font-semibold text-gray-900 mb-2">Testing Tips</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Scroll to test auto-hide behavior</li>
          <li>• Click nav items to see animations</li>
          <li>• Try minimal mode expansion</li>
          <li>• Use comparison view to evaluate</li>
          <li>• Test different backgrounds</li>
          <li>• Test on mobile device or DevTools</li>
        </ul>
      </div>

      {/* Pattern Background Style */}
      <style jsx global>{`
        .bg-pattern {
          background-color: #1a1a2e;
          background-image: 
            repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.05) 35px, rgba(255,255,255,.05) 70px),
            repeating-linear-gradient(-45deg, transparent, transparent 35px, rgba(255,255,255,.03) 35px, rgba(255,255,255,.03) 70px);
        }
      `}</style>
    </div>
  );
}
