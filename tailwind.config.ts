import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
        // Tablet uses burger menu up to 1080px
        'desktop': '1080px',
      },
      colors: {
        // ⚠️  BRAND color — the site's actual primary color is RED (#d42027).
        //    Use `brand-*` classes for anything that should match the site brand.
        //    Defined in theme.ts as theme.colors.primary.
        brand: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#e84848',
          600: '#d42027', // Brand primary — matches theme.ts
          700: '#b01b21', // Brand hover
          800: '#a1181d', // Brand dark hover — matches theme.ts primaryHover
          900: '#7f1d1d',
        },
        // ⚠️  LEGACY purple palette — NOT the brand color.
        //    Kept for backward compatibility with existing components.
        //    Do NOT use for new brand-related styling; use `brand-*` instead.
        primary: {
          50: '#f8f7fa',
          100: '#f1eff5',
          200: '#e0dce8',
          300: '#c8c0d4',
          400: '#a99abb',
          500: '#8f7ba3',
          600: '#7a6389',
          700: '#6b5370',
          800: '#5a4f66',
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
        // Button and form colors (legacy — see brand-* for brand-colored elements)
        'btn-primary': '#666',
        'btn-primary-hover': '#241935',
        'form-border': '#555',
        'form-focus': '#5A4F66',  // Legacy purple focus ring — new forms should use brand-600
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
      // Custom animations moved to globals.css for better reliability
    },
  },
  plugins: [],
};
export default config;
