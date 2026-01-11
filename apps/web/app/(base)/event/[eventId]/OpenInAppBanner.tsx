"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Smartphone, X } from "lucide-react";

import { Button } from "@soonlist/ui/button";

interface OpenInAppBannerProps {
  eventId: string;
}

// Detect if we're in an in-app browser (Instagram, Facebook, TikTok, etc.)
function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor;

  // Instagram webview
  if (ua.includes("Instagram")) return true;

  // Facebook webview
  if (ua.includes("FBAN") || ua.includes("FBAV")) return true;

  // TikTok webview
  if (ua.includes("TikTok") || ua.includes("BytedanceWebview")) return true;

  // Twitter/X webview
  if (ua.includes("Twitter")) return true;

  // LinkedIn webview
  if (ua.includes("LinkedInApp")) return true;

  // Generic webview detection for iOS
  if (
    ua.includes("iPhone") &&
    !ua.includes("Safari") &&
    ua.includes("AppleWebKit")
  ) {
    return true;
  }

  return false;
}

// Detect if we're on iOS
function isIOS(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua);
}

export function OpenInAppBanner({ eventId }: OpenInAppBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show banner for in-app browsers on iOS
    const shouldShow = isInAppBrowser() && isIOS();
    setShowBanner(shouldShow);
  }, []);

  if (!showBanner || dismissed) {
    return null;
  }

  const eventUrl = `https://www.soonlist.com/event/${eventId}`;
  const appStoreUrl =
    "https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216";

  // Universal link that should open in the app if installed
  const universalLink = eventUrl;

  const handleOpenInApp = () => {
    // Try to open via universal link first
    window.location.href = universalLink;

    // Fallback to App Store after a delay if the app isn't installed
    setTimeout(() => {
      window.location.href = appStoreUrl;
    }, 1500);
  };

  const handleOpenInSafari = () => {
    // On iOS, this opens the URL in Safari instead of the in-app browser
    // Using the special x-safari-https scheme
    window.location.href = `x-safari-${eventUrl}`;
  };

  return (
    <div className="mb-4 rounded-xl border border-interactive-2 bg-interactive-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="mb-3 text-sm font-medium text-neutral-1">
            For the best experience, open this event in the Soonlist app
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleOpenInApp}
              size="sm"
              className="gap-1.5"
              variant="default"
            >
              <Smartphone className="size-4" />
              Open in App
            </Button>
            <Button
              onClick={handleOpenInSafari}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <ExternalLink className="size-4" />
              Open in Safari
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-neutral-2 hover:bg-neutral-4 hover:text-neutral-1"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
