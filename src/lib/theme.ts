/**
 * Shared Theme Configuration
 * 
 * Centralized theme tokens to avoid component coupling and enable
 * consistent styling across the application.
 * 
 * Usage:
 *   import { theme, zIndex } from '@/lib/theme';
 *   style={{ backgroundColor: theme.colors.primary }}
 *   className={`z-[${zIndex.navbar}]`}
 */

export const theme = {
  colors: {
    // Brand colors
    primary: '#d42027',
    primaryHover: '#a1181d',
    
    // Background colors
    background: '#ffffff',
    backgroundSecondary: '#f9fafb',
    
    // Text colors
    textPrimary: '#000000',
    textSecondary: '#444444',
    textSubtle: '#888888',
    textLight: '#cccccc',
    
    // Accent colors
    accent: {
      50: '#fff9f5',
      100: '#fef2e8',
      200: '#fce4cc',
      300: '#f9d1a5',
      400: '#f5b573',
      500: '#f19441',
      600: '#e67e22',
      700: '#d35400',
      800: '#a04000',
      900: '#7d3200',
    },
  },
} as const;

/**
 * Z-Index Scale
 * 
 * Coordinated z-index values to prevent stacking context conflicts.
 * Always use these values instead of arbitrary numbers.
 * 
 * Layers:
 * - Content (0-10): Base page elements
 * - Navigation (40-50): Fixed navigation elements
 * - Overlays (60-80): Modals, drawers, sheets
 * - System (90-100): Toasts, tooltips
 */
export const zIndex = {
  // Content layers (0-10)
  base: 0,
  dropdown: 10,
  
  // Navigation (40-50)
  navbar: 40,
  bottomNav: 50,
  
  // Overlays (60-80)
  backdrop: 60,
  drawer: 70,
  modal: 80,
  
  // System (90-100)
  toast: 90,
  tooltip: 100,
} as const;

export type Theme = typeof theme;
export type ZIndex = typeof zIndex;

// Re-export for backward compatibility with existing code
export const colors = theme.colors;
