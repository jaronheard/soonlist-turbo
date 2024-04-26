import { type Metadata } from "next";
import "@/styles/globals.css";
import { cookies } from "next/headers";
import dynamic from "next/dynamic";
import { Kalam, IBM_Plex_Sans } from "next/font/google";
import { PHProvider, Providers } from "./providers";
import { TRPCReactProvider } from "@/trpc/react";

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
const tagline = "Events for everybody";
const description =
  "Gather, organize, and share events that matter to you and your communities.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.soonlist.com/"),
  title,
  description: tagline,
  openGraph: {
    siteName: "Soonlist",
    title: "Event lists for everybody",
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
      <PHProvider>
        <body>
          <PostHogPageView />
          <TRPCReactProvider cookies={cookies().toString()}>
            <Providers>{children}</Providers>
          </TRPCReactProvider>
        </body>
      </PHProvider>
    </html>
  );
}
