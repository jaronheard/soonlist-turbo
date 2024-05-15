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
    "@acme/validators",
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
    ],
  },
  async rewrites() {
    return process.env.NODE_ENV === "production"
      ? [
          {
            source: "/ingest/static/:path*",
            destination: "https://us-assets.i.posthog.com/static/:path*",
          },
          {
            source: "/ingest/:path*",
            destination: "https://us.i.posthog.com/:path*",
          },
        ]
      : [];
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

export default nextConfig;
