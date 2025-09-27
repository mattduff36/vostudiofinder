import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
  
  // Sentry configuration moved to withSentryConfig options

  // Image optimization
  images: {
    domains: ['res.cloudinary.com', 'lh3.googleusercontent.com', 'pbs.twimg.com', 'images.unsplash.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // External packages for server components
  serverExternalPackages: ['@prisma/client'],

  // Environment variables to expose to the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  },

  // Admin route configuration
  async rewrites() {
    return [
      // Admin routes are handled by the app router structure
      // No rewrites needed as /admin/* routes are directly accessible
    ];
  },

  // Headers for admin routes
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Experimental features for admin functionality
  experimental: {
    // Enable server actions for admin forms
    serverActions: true,
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG || 'default-org',
  project: process.env.SENTRY_PROJECT || 'default-project',
  authToken: process.env.SENTRY_AUTH_TOKEN || '',
  silent: true,
  
  // Use hidden-source-map for better performance
  hideSourceMaps: true,
  
  // Disable during development
  disableServerWebpackPlugin: process.env.NODE_ENV === 'development',
  disableClientWebpackPlugin: process.env.NODE_ENV === 'development',
};

// Make sure adding Sentry options is the last code to run before exporting
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
