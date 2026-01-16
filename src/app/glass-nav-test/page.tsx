'use client';

import { useState } from 'react';
import { Session } from 'next-auth';
import { AdaptiveGlassNav } from '@/components/glass-nav-examples/AdaptiveGlassNav';
import type { GlassCustomization } from '@/types/glass-customization';

// Mock session for testing
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
  const [background, setBackground] = useState<'white' | 'black' | 'gradient' | 'color' | 'image'>('gradient');
  const [customization, setCustomization] = useState<GlassCustomization>({
    // Glass Effect
    blur: 40,
    saturation: 200,
    brightness: 1.15,
    contrast: 0.85,
    
    // Background
    backgroundOpacity: 0.45,
    
    // Border
    borderWidth: 0.5,
    borderOpacity: 0.3,
    
    // Size
    circleSize: 56,
    pillPaddingX: 12,
    pillPaddingY: 6,
    fontSize: 11,
    
    // Shadow
    shadowIntensity: 0.15,
    shadowSpread: 40,
    
    // Animation
    hoverLift: 4,
    hoverScale: 1.08,
    
    // Adaptive Settings
    adaptiveEnabled: true,
    darkBrightness: 1.4,
    lightBrightness: 0.95,
    luminanceThreshold: 0.4,
  });

  const updateCustomization = (key: keyof GlassCustomization, value: number | boolean) => {
    setCustomization(prev => ({ ...prev, [key]: value }));
  };

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

  const resetDefaults = () => {
    setCustomization({
      blur: 40,
      saturation: 200,
      brightness: 1.15,
      contrast: 0.85,
      backgroundOpacity: 0.45,
      borderWidth: 0.5,
      borderOpacity: 0.3,
      circleSize: 56,
      pillPaddingX: 12,
      pillPaddingY: 6,
      fontSize: 11,
      shadowIntensity: 0.15,
      shadowSpread: 40,
      hoverLift: 4,
      hoverScale: 1.08,
      adaptiveEnabled: true,
      darkBrightness: 1.4,
      lightBrightness: 0.95,
      luminanceThreshold: 0.4,
    });
  };

  const copyToClipboard = () => {
    const css = `
/* Glass Navigation Customization */
.adaptive-circle-glass, .adaptive-pill-glass {
  backdrop-filter: blur(${customization.blur}px) saturate(${customization.saturation}%) 
                   brightness(${customization.brightness}) contrast(${customization.contrast});
  background: rgba(128, 128, 128, ${customization.backgroundOpacity});
  border: ${customization.borderWidth}px solid rgba(128, 128, 128, ${customization.borderOpacity});
  box-shadow: 0 ${customization.shadowSpread}px ${customization.shadowSpread * 2}px rgba(0, 0, 0, ${customization.shadowIntensity});
}

.adaptive-circle-glass {
  width: ${customization.circleSize}px;
  height: ${customization.circleSize}px;
}

.adaptive-pill-glass {
  padding: ${customization.pillPaddingY}px ${customization.pillPaddingX}px;
  font-size: ${customization.fontSize}px;
}

.group:hover .adaptive-circle-glass,
.group:hover .adaptive-pill-glass {
  transform: translateY(-${customization.hoverLift}px) scale(${customization.hoverScale});
}

/* Adaptive Settings */
Dark Background Brightness: ${customization.darkBrightness}
Light Background Brightness: ${customization.lightBrightness}
Luminance Threshold: ${customization.luminanceThreshold}
`;
    navigator.clipboard.writeText(css);
    alert('CSS copied to clipboard!');
  };

  return (
    <div className={`min-h-screen ${getBackgroundClass(background)} transition-colors duration-500 relative`}>
      {/* Pattern overlay for image background */}
      {background === 'image' && (
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
      )}

      {/* Control Panel */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-lg z-50 max-h-[70vh] overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Glass Navigation Customizer</h1>
            <div className="flex gap-3">
              <button
                onClick={resetDefaults}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Reset Defaults
              </button>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Copy CSS
              </button>
            </div>
          </div>

          {/* Background Selector */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Background</label>
            <div className="flex gap-3">
              {(['white', 'black', 'gradient', 'color', 'image'] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() => setBackground(bg)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    background === bg
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {bg.charAt(0).toUpperCase() + bg.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Glass Effect Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Glass Effect</h3>
              
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Blur</span>
                  <span className="text-blue-600">{customization.blur}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={customization.blur}
                  onChange={(e) => updateCustomization('blur', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Saturation</span>
                  <span className="text-blue-600">{customization.saturation}%</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="300"
                  step="5"
                  value={customization.saturation}
                  onChange={(e) => updateCustomization('saturation', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Brightness</span>
                  <span className="text-blue-600">{customization.brightness.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={customization.brightness}
                  onChange={(e) => updateCustomization('brightness', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Contrast</span>
                  <span className="text-blue-600">{customization.contrast.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={customization.contrast}
                  onChange={(e) => updateCustomization('contrast', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Background Opacity</span>
                  <span className="text-blue-600">{customization.backgroundOpacity.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={customization.backgroundOpacity}
                  onChange={(e) => updateCustomization('backgroundOpacity', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Border & Shadow Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Border & Shadow</h3>
              
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Border Width</span>
                  <span className="text-blue-600">{customization.borderWidth}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={customization.borderWidth}
                  onChange={(e) => updateCustomization('borderWidth', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Border Opacity</span>
                  <span className="text-blue-600">{customization.borderOpacity.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={customization.borderOpacity}
                  onChange={(e) => updateCustomization('borderOpacity', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Shadow Intensity</span>
                  <span className="text-blue-600">{customization.shadowIntensity.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={customization.shadowIntensity}
                  onChange={(e) => updateCustomization('shadowIntensity', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Shadow Spread</span>
                  <span className="text-blue-600">{customization.shadowSpread}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="2"
                  value={customization.shadowSpread}
                  onChange={(e) => updateCustomization('shadowSpread', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Size & Typography Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Size & Typography</h3>
              
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Circle Size</span>
                  <span className="text-blue-600">{customization.circleSize}px</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="80"
                  step="2"
                  value={customization.circleSize}
                  onChange={(e) => updateCustomization('circleSize', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Pill Padding X</span>
                  <span className="text-blue-600">{customization.pillPaddingX}px</span>
                </label>
                <input
                  type="range"
                  min="6"
                  max="24"
                  step="1"
                  value={customization.pillPaddingX}
                  onChange={(e) => updateCustomization('pillPaddingX', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Pill Padding Y</span>
                  <span className="text-blue-600">{customization.pillPaddingY}px</span>
                </label>
                <input
                  type="range"
                  min="4"
                  max="12"
                  step="1"
                  value={customization.pillPaddingY}
                  onChange={(e) => updateCustomization('pillPaddingY', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Font Size</span>
                  <span className="text-blue-600">{customization.fontSize}px</span>
                </label>
                <input
                  type="range"
                  min="8"
                  max="16"
                  step="0.5"
                  value={customization.fontSize}
                  onChange={(e) => updateCustomization('fontSize', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Animation Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Animation</h3>
              
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Hover Lift</span>
                  <span className="text-blue-600">{customization.hoverLift}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={customization.hoverLift}
                  onChange={(e) => updateCustomization('hoverLift', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                  <span>Hover Scale</span>
                  <span className="text-blue-600">{customization.hoverScale.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="1.2"
                  step="0.01"
                  value={customization.hoverScale}
                  onChange={(e) => updateCustomization('hoverScale', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Adaptive Settings Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Adaptive Settings</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customization.adaptiveEnabled}
                    onChange={(e) => updateCustomization('adaptiveEnabled', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-gray-700">Enable Adaptive</span>
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                    <span>Dark BG Brightness</span>
                    <span className="text-blue-600">{customization.darkBrightness.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="2"
                    step="0.05"
                    value={customization.darkBrightness}
                    onChange={(e) => updateCustomization('darkBrightness', parseFloat(e.target.value))}
                    className="w-full"
                    disabled={!customization.adaptiveEnabled}
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                    <span>Light BG Brightness</span>
                    <span className="text-blue-600">{customization.lightBrightness.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={customization.lightBrightness}
                    onChange={(e) => updateCustomization('lightBrightness', parseFloat(e.target.value))}
                    className="w-full"
                    disabled={!customization.adaptiveEnabled}
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-2">
                    <span>Luminance Threshold</span>
                    <span className="text-blue-600">{customization.luminanceThreshold.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="0.8"
                    step="0.05"
                    value={customization.luminanceThreshold}
                    onChange={(e) => updateCustomization('luminanceThreshold', parseFloat(e.target.value))}
                    className="w-full"
                    disabled={!customization.adaptiveEnabled}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="pt-96 pb-32 px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className={`p-8 rounded-2xl ${background === 'white' ? 'bg-gray-100/50 text-gray-900' : background === 'black' ? 'bg-gray-800/50 text-white' : 'bg-white/30 backdrop-blur-sm text-gray-900'}`}>
            <h2 className="text-2xl font-bold mb-4">Test Content</h2>
            <p className="text-base leading-relaxed">
              Scroll around and hover over the navigation buttons below to see the glass effects in action. 
              Adjust the controls above to customize every aspect of the glass navigation.
            </p>
          </div>

          <div className={`p-8 rounded-2xl ${background === 'white' ? 'bg-gray-200/50 text-gray-900' : background === 'black' ? 'bg-gray-700/50 text-white' : 'bg-white/40 backdrop-blur-sm text-gray-900'}`}>
            <h3 className="text-xl font-bold mb-3">Premium Glass Effect</h3>
            <p className="text-base">
              The navigation adapts to the background behind it, creating a beautiful premium look 
              that works on any color or pattern.
            </p>
          </div>
        </div>
      </div>

      {/* Live Glass Navigation */}
      <AdaptiveGlassNav
        mode="static"
        session={mockSession}
        onMenuClick={() => alert('Menu clicked!')}
        customization={customization}
      />

      <style jsx global>{`
        .bg-pattern {
          background-color: #6366f1;
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 35px,
            rgba(255, 255, 255, 0.1) 35px,
            rgba(255, 255, 255, 0.1) 70px
          );
        }
      `}</style>
    </div>
  );
}
