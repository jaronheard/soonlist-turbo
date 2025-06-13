import type { Metadata, Viewport } from "next";

import "~/styles/globals.css";

import { IBM_Plex_Sans, Kalam } from "next/font/google";

import PostHogClient from "./PostHogClient";
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

const title = "Soonlist";
const tagline = "Your photos → your event list";
const description =
  "See it, save it, show up. It's that easy with Soonlist. Now available on iOS.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.soonlist.com/"),
  title,
  description: tagline,
  openGraph: {
    siteName: "Soonlist",
    title: "Your photos → your event list",
    description,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://upcdn.io/12a1yek/raw/uploads/Soonlist/soonlist-meta.webp",
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
  other: {
    "apple-itunes-app": "app-id=6670222216",
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
          <Providers>
            <PostHogClient />
            {children}
          </Providers>
        </body>
      </PHProvider>
    </html>
  );
}
