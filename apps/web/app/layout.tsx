import type { Metadata, Viewport } from "next";

import "~/styles/globals.css";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { IBM_Plex_Sans, Kalam } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { PHProvider, Providers } from "./providers";

export const preferredRegion = "pdx1";

const kalam = Kalam({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-kalam",
});

const plex_sans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const PostHogPageView = dynamic(() => import("./PostHogPageView"), {
  ssr: false,
});

const title = "Soonlist";
const tagline = "Organize possibilities";
const description =
  "Save events from anywhere. Make lists for your communities, friends, or yourself. Experience, connect, and grow.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.soonlist.com/"),
  title,
  description: tagline,
  openGraph: {
    siteName: "Soonlist",
    title: "Organize possibilities",
    description,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
      },
    ],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
    date: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Also supported by less commonly used
  // interactiveWidget: 'resizes-visual',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`!overflow-x-hidden ${kalam.variable} ${plex_sans.variable}`}
    >
      <PHProvider>
        <body className="overflow-x-hidden">
          <TRPCReactProvider>
            <Providers>
              <Suspense>
                <PostHogPageView />
              </Suspense>
              {children}
            </Providers>
          </TRPCReactProvider>
        </body>
      </PHProvider>
    </html>
  );
}
