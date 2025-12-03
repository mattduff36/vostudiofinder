import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Original VoiceoverStudioFinder color scheme
        primary: {
          50: '#f8f7fa',
          100: '#f1eff5',
          200: '#e0dce8',
          300: '#c8c0d4',
          400: '#a99abb',
          500: '#8f7ba3',
          600: '#7a6389',
          700: '#6b5370',
          800: '#5a4f66', // Main accent color from original
          900: '#4a3f56',
        },
        secondary: {
          50: '#f9f9f9',
          100: '#f3f3f3',
          200: '#e6e6e6',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#27292b', // Dark text color from original
          900: '#1a1a1a',
        },
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
        // Text colors matching original
        'text-primary': '#27292b',
        'text-secondary': '#999',
        'text-light': '#ccc',
        // Button and form colors
        'btn-primary': '#666',
        'btn-primary-hover': '#241935',
        'form-border': '#555',
        'form-focus': '#5A4F66',
        // Background colors
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'Consolas', 'monospace'],
        raleway: ['var(--font-raleway)', 'Raleway', 'sans-serif'],
      },
      fontSize: {
        hp1: '56px', // Homepage hero - unchanged
        h1: '28px',  // Reduced by 50%
        h2: '24px',  // Reduced by 50%
        h3: '18px',  // Reduced by 50%
        h4: '30px',
        h5: '24px',
        h6: '16px',
      },
      spacing: {
        '46': '46px', // Form control height from original
      },
      keyframes: {
        'slide-in-up': {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(80px) scale(0.9)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)' 
          },
        },
        'slide-in-left': {
          '0%': { 
            opacity: '0', 
            transform: 'translateX(-100%) scale(0.8)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateX(0) scale(1)' 
          },
        },
        'expand-center': {
          '0%': { 
            opacity: '0', 
            transform: 'scale(0) rotate(-5deg)' 
          },
          '60%': { 
            transform: 'scale(1.05) rotate(2deg)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'scale(1) rotate(0deg)' 
          },
        },
      },
      animation: {
        'slide-in-up': 'slide-in-up 1s ease-out forwards',
        'slide-in-left': 'slide-in-left 1.2s ease-out forwards',
        'expand-center': 'expand-center 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
    },
  },
  plugins: [],
};
export default config;
