'use client';

import { useState, useEffect } from 'react';
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

const DEFAULT_VALUES: GlassCustomization = {
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
};

export default function GlassNavTestPage() {
  const [background, setBackground] = useState<'white' | 'black' | 'gradient' | 'color' | 'image'>('gradient');
  const [customization, setCustomization] = useState<GlassCustomization>(DEFAULT_VALUES);

  // Load saved settings from localStorage on mount
  useEffect(() => {
    const savedCustomization = localStorage.getItem('glassNavCustomization');
    const savedBackground = localStorage.getItem('glassNavBackground');
    
    if (savedCustomization) {
      try {
        const parsed = JSON.parse(savedCustomization);
        setCustomization(parsed);
      } catch (e) {
        console.error('Failed to parse saved customization', e);
      }
    }
    
    if (savedBackground) {
      setBackground(savedBackground as typeof background);
    }
  }, []);

  // Save customization to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('glassNavCustomization', JSON.stringify(customization));
    console.log('✅ SAVED to localStorage:', customization);
  }, [customization]);

  // Save background to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('glassNavBackground', background);
  }, [background]);

  // Debug: Log customization changes
  useEffect(() => {
    console.log('📊 CUSTOMIZATION STATE UPDATED:', customization);
    console.log('🎯 Current values being passed to AdaptiveGlassNav:', {
      blur: customization.blur,
      saturation: customization.saturation,
      brightness: customization.brightness,
      contrast: customization.contrast,
      backgroundOpacity: customization.backgroundOpacity,
      circleSize: customization.circleSize,
    });
  }, [customization]);

  const updateValue = (key: keyof GlassCustomization, value: number | boolean) => {
    console.log(`🔧 SLIDER CHANGED: "${key}" = ${value}`);
    setCustomization(prev => {
      const newState = { ...prev, [key]: value };
      console.log(`✨ NEW STATE for "${key}":`, newState[key]);
      return newState;
    });
  };

  const resetDefaults = () => {
    setCustomization(DEFAULT_VALUES);
    setBackground('gradient');
    localStorage.removeItem('glassNavCustomization');
    localStorage.removeItem('glassNavBackground');
  };

  const getBackgroundStyle = () => {
    switch (background) {
      case 'white':
        return { background: '#ffffff' };
      case 'black':
        return { background: '#000000' };
      case 'gradient':
        return { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };
      case 'color':
        return { background: 'linear-gradient(to right, #ff6b6b, #4ecdc4, #45b7d1)' };
      case 'image':
        return { 
          background: 'url("/background-images/studio-hero-1.jpg") center/cover',
          position: 'relative' as const
        };
    }
  };

  return (
    <div className="min-h-screen" style={getBackgroundStyle()}>
      {/* Glass Navigation */}
      <AdaptiveGlassNav 
        mode="static"
        session={mockSession} 
        onMenuClick={() => {}}
        customization={customization} 
      />

      {/* Controls Panel */}
      <div className="pt-24 pb-32 px-4 max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Glass Nav Customizer</h1>
            <p className="text-gray-600">Adjust settings in real-time</p>
          </div>

          {/* Background Selector */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Background</h3>
            <div className="flex gap-2 flex-wrap">
              {(['white', 'black', 'gradient', 'color', 'image'] as const).map((bg) => (
                <button
                  key={bg}
                  onClick={() => setBackground(bg)}
                  className={`px-4 py-2 rounded-lg capitalize transition-all ${
                    background === bg
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Glass Effect Controls */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">Glass Effect</h3>
            
            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Blur</span>
                <span className="text-gray-500">{customization.blur}px</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={customization.blur}
                onChange={(e) => updateValue('blur', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Saturation</span>
                <span className="text-gray-500">{customization.saturation}%</span>
              </label>
              <input
                type="range"
                min="100"
                max="300"
                step="10"
                value={customization.saturation}
                onChange={(e) => updateValue('saturation', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Brightness</span>
                <span className="text-gray-500">{customization.brightness.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={customization.brightness}
                onChange={(e) => updateValue('brightness', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Contrast</span>
                <span className="text-gray-500">{customization.contrast.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={customization.contrast}
                onChange={(e) => updateValue('contrast', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Background & Border Controls */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">Background & Border</h3>
            
            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Background Opacity</span>
                <span className="text-gray-500">{customization.backgroundOpacity.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={customization.backgroundOpacity}
                onChange={(e) => updateValue('backgroundOpacity', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Border Width</span>
                <span className="text-gray-500">{customization.borderWidth}px</span>
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.5"
                value={customization.borderWidth}
                onChange={(e) => updateValue('borderWidth', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Border Opacity</span>
                <span className="text-gray-500">{customization.borderOpacity.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={customization.borderOpacity}
                onChange={(e) => updateValue('borderOpacity', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Size Controls */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">Size</h3>
            
            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Circle Size</span>
                <span className="text-gray-500">{customization.circleSize}px</span>
              </label>
              <input
                type="range"
                min="40"
                max="80"
                step="2"
                value={customization.circleSize}
                onChange={(e) => updateValue('circleSize', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Pill Padding X</span>
                <span className="text-gray-500">{customization.pillPaddingX}px</span>
              </label>
              <input
                type="range"
                min="4"
                max="24"
                step="2"
                value={customization.pillPaddingX}
                onChange={(e) => updateValue('pillPaddingX', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Pill Padding Y</span>
                <span className="text-gray-500">{customization.pillPaddingY}px</span>
              </label>
              <input
                type="range"
                min="2"
                max="16"
                step="2"
                value={customization.pillPaddingY}
                onChange={(e) => updateValue('pillPaddingY', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Font Size</span>
                <span className="text-gray-500">{customization.fontSize}px</span>
              </label>
              <input
                type="range"
                min="8"
                max="16"
                step="1"
                value={customization.fontSize}
                onChange={(e) => updateValue('fontSize', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Shadow Controls */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">Shadow</h3>
            
            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Shadow Intensity</span>
                <span className="text-gray-500">{customization.shadowIntensity.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={customization.shadowIntensity}
                onChange={(e) => updateValue('shadowIntensity', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Shadow Spread</span>
                <span className="text-gray-500">{customization.shadowSpread}px</span>
              </label>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={customization.shadowSpread}
                onChange={(e) => updateValue('shadowSpread', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Animation Controls */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">Animation</h3>
            
            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Hover Lift</span>
                <span className="text-gray-500">{customization.hoverLift}px</span>
              </label>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={customization.hoverLift}
                onChange={(e) => updateValue('hoverLift', Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm mb-1">
                <span>Hover Scale</span>
                <span className="text-gray-500">{customization.hoverScale.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="1"
                max="1.2"
                step="0.01"
                value={customization.hoverScale}
                onChange={(e) => updateValue('hoverScale', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Adaptive Settings */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold">Adaptive Glass</h3>
            
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={customization.adaptiveEnabled}
                  onChange={(e) => updateValue('adaptiveEnabled', e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Enable Adaptive Mode</span>
              </label>
            </div>

            {customization.adaptiveEnabled && (
              <>
                <div>
                  <label className="flex justify-between text-sm mb-1">
                    <span>Dark Background Brightness</span>
                    <span className="text-gray-500">{customization.darkBrightness.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.05"
                    value={customization.darkBrightness}
                    onChange={(e) => updateValue('darkBrightness', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm mb-1">
                    <span>Light Background Brightness</span>
                    <span className="text-gray-500">{customization.lightBrightness.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={customization.lightBrightness}
                    onChange={(e) => updateValue('lightBrightness', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-sm mb-1">
                    <span>Luminance Threshold</span>
                    <span className="text-gray-500">{customization.luminanceThreshold.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={customization.luminanceThreshold}
                    onChange={(e) => updateValue('luminanceThreshold', Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-6 flex gap-3">
            <button
              onClick={resetDefaults}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Reset Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
