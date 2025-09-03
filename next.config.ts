import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
  
  // Sentry configuration moved to withSentryConfig options

  // Image optimization
  images: {
    domains: ['res.cloudinary.com', 'lh3.googleusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // External packages for server components
  serverExternalPackages: ['@prisma/client'],

  // Environment variables to expose to the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
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
