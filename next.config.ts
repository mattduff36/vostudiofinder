import type { NextConfig } from 'next';
import { execSync } from 'node:child_process';

function safeExec(cmd: string): string | undefined {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return undefined;
  }
}

const buildTimeIso = new Date().toISOString();
const buildVersion =
  process.env.GITHUB_RUN_NUMBER ||
  safeExec('git rev-list --count HEAD') ||
  '';

const gitCommitDateIso =
  process.env.VERCEL_GIT_COMMIT_DATE ||
  safeExec('git show -s --format=%cI HEAD') ||
  buildTimeIso;

const nextConfig: NextConfig = {
  /* config options here */

  // Disable streamed metadata so crawlers and SEO tools always receive
  // robots/canonical tags inside <head> on App Router routes.
  htmlLimitedBots: /.*/,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // External packages for server components
  serverExternalPackages: ['@prisma/client'],

  // Environment variables to expose to the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    // Build metadata (auto-updates each push/build via git/CI metadata)
    NEXT_PUBLIC_GIT_COMMIT_DATE: gitCommitDateIso,
    NEXT_PUBLIC_BUILD_VERSION: buildVersion,
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
    serverActions: {
      allowedOrigins: ['localhost:4000'],
    },
  },
};

// Docker/local packaging requires standalone output.
// Vercel uses its own Next.js adapter and must not set standalone:
// Next.js 16.3 adapter builds omit `.next/next-server.js.nft.json`,
// which standalone finalisation then fails to open (ENOENT).
// Assigned here (not `output: undefined`) because NextConfig forbids
// explicit undefined under exactOptionalPropertyTypes.
if (!process.env.VERCEL) {
  nextConfig.output = 'standalone';
}

export default nextConfig;
