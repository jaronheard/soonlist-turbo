"use client";

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@soonlist/ui/button";

interface OpenInAppBannerProps {
  deepLink: string;
  label?: string;
}

function isInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent || navigator.vendor;

  if (ua.includes("Instagram")) return true;

  if (ua.includes("FBAN") || ua.includes("FBAV")) return true;

  if (ua.includes("TikTok") || ua.includes("BytedanceWebview")) return true;

  if (ua.includes("Twitter")) return true;

  if (ua.includes("LinkedInApp")) return true;

  if (
    ua.includes("iPhone") &&
    !ua.includes("Safari") &&
    ua.includes("AppleWebKit")
  ) {
    return true;
  }

  return false;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua);
}

export function OpenInAppBanner({ deepLink, label }: OpenInAppBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const shouldShow = isInAppBrowser() && isIOS();
    setShowBanner(shouldShow);
  }, []);

  if (!showBanner || dismissed) {
    return null;
  }

  const appStoreUrl =
    "https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216";

  const handleOpenInApp = () => {
    const isDev = process.env.NODE_ENV !== "production";

    window.location.href = deepLink;

    if (!isDev) {
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = appStoreUrl;
        }
      }, 2000);
    } else {
      setTimeout(() => {
        if (!document.hidden) {
          toast(
            "Deep link attempted. Make sure you have the development app installed.",
          );
        }
      }, 2000);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-interactive-2 bg-interactive-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="mb-3 text-sm font-medium text-neutral-1">
            {label ?? "For the best experience, open this in the Soonlist app"}
          </p>
          <Button
            onClick={handleOpenInApp}
            size="sm"
            className="gap-1.5"
            variant="default"
          >
            <Smartphone className="size-4" />
            Open in App
          </Button>
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
