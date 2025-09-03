import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
  
  // Sentry configuration
  sentry: {
    // Use `hidden-source-map` rather than `source-map` as the Webpack `devtool`
    // for client-side builds. (This will be the default starting in
    // `@sentry/nextjs` version 8.0.0.) See
    // https://webpack.js.org/configuration/devtool/ and
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#use-hidden-source-map
    // for more information.
    hideSourceMaps: true,
    
    // Disable Sentry during development
    disableServerWebpackPlugin: process.env.NODE_ENV === 'development',
    disableClientWebpackPlugin: process.env.NODE_ENV === 'development',
  },

  // Image optimization
  images: {
    domains: ['res.cloudinary.com', 'lh3.googleusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Experimental features
  experimental: {
    // Enable Server Components
    serverComponentsExternalPackages: ['@prisma/client'],
  },

  // Environment variables to expose to the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: true, // Suppresses all logs

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
};

// Make sure adding Sentry options is the last code to run before exporting
export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
