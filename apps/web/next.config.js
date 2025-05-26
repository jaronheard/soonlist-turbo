import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";
import createJiti from "jiti";

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
createJiti(fileURLToPath(import.meta.url))("./env");

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** T3 defaults */
  reactStrictMode: true,
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@soonlist/api",
    "@soonlist/cal",
    "@soonlist/db",
    "@soonlist/ui",
    "@soonlist/validators",
  ],
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  /** custom configuration */
  productionBrowserSourceMaps: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "upcdn.io",
      },
      {
        protocol: "https",
        hostname: "mirrors.creativecommons.org",
      },
      {
        protocol: "https",
        hostname: "toolbox.marketingtools.apple.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/app/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/app/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/onboarding",
        destination: "/",
        permanent: true,
      },
      {
        source: "/early-access",
        destination: "/",
        permanent: true,
      },
      {
        source: "/get-app",
        destination: "https://testflight.apple.com/join/AjmerTKm",
        permanent: false,
      },
      // Redirects for deleted routes
      {
        source: "/:userName/events",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:userName/following",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:userName/following/lists",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:userName/following/users",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:userName/saved",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:userName/list/:listId",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:userName/list/:listId/edit",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:userName/list/new",
        destination: "/",
        permanent: true,
      },
      {
        source: "/users",
        destination: "/",
        permanent: true,
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  async headers() {
    const headers = [];
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
      headers.push({
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
        source: "/:path*",
      });
    }
    return headers;
  },
};

// Injected content via Sentry wizard below
const nextConfigWithSentry =
  process.env.NODE_ENV === "production"
    ? withSentryConfig(nextConfig, {
        // For all available options, see:
        // https://github.com/getsentry/sentry-webpack-plugin#options
        authToken: process.env.SENTRY_AUTH_TOKEN,

        // Suppresses source map uploading logs during build
        silent: !process.env.CI,
        org: "soonlist",
        project: "soonlist",
        tunnelRoute: "/monitoring",
        // For all available options, see:
        // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

        // Upload a larger set of source maps for prettier stack traces (increases build time)
        widenClientFileUpload: true,

        // Hides source maps from generated client bundles
        hideSourceMaps: true,

        // Automatically tree-shake Sentry logger statements to reduce bundle size
        disableLogger: true,

        // Enables automatic instrumentation of Vercel Cron Monitors.
        // See the following for more information:
        // https://docs.sentry.io/product/crons/
        // https://vercel.com/docs/cron-jobs
        automaticVercelMonitors: true,
      })
    : nextConfig;

export default nextConfigWithSentry;
