import type { Metadata } from "next";

import "~/styles/globals.css";

import dynamic from "next/dynamic";
import { IBM_Plex_Sans, Kalam } from "next/font/google";
import Head from "next/head";

import { TRPCReactProvider } from "~/trpc/react";
import { PHProvider, Providers } from "./providers";

// edge causes sigkill on vercel about 50% of the time
// workaround is to use VERCEL_FORCE_NO_BUILD_CACHE=1
export const runtime = "edge";
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
      <Head>
        {/* globalThis polyfill https://github.com/vercel/next.js/discussions/58818#discussioncomment-8431496 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(t){function e(){var e=this||self;e.globalThis=e,delete t.prototype._T_}"object"!=typeof globalThis&&(this?e():(t.defineProperty(t.prototype,"_T_",{configurable:!0,get:e}),_T_))}(Object);`,
          }}
        />
      </Head>
      <PHProvider>
        <body>
          <PostHogPageView />
          <TRPCReactProvider>
            <Providers>{children}</Providers>
          </TRPCReactProvider>
        </body>
      </PHProvider>
    </html>
  );
}
