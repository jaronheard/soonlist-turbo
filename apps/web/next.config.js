import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";
import createJiti from "jiti";

createJiti(fileURLToPath(import.meta.url))("./env");

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@soonlist/cal", "@soonlist/ui", "@soonlist/validators"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
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
      {
        protocol: "https",
        hostname: "api.qrserver.com",
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

const nextConfigWithSentry =
  process.env.NODE_ENV === "production"
    ? withSentryConfig(nextConfig, {
        authToken: process.env.SENTRY_AUTH_TOKEN,

        silent: !process.env.CI,
        org: "soonlist",
        project: "soonlist",
        tunnelRoute: "/monitoring",

        widenClientFileUpload: true,

        hideSourceMaps: true,

        disableLogger: true,

        automaticVercelMonitors: true,
      })
    : nextConfig;

export default nextConfigWithSentry;
