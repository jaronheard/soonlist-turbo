"use client";

import { useEffect, useState } from "react";
import { Bookmark, Share } from "lucide-react";
import { toast } from "sonner";

import { createDeepLink } from "@soonlist/api/utils/urlScheme";

import { env } from "~/env";

interface EventData {
  name?: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
}

interface SaveButtonProps {
  eventId: string;
  event?: EventData;
  type?: "button" | "icon";
  className?: string;
  userId?: string; // Current user's ID
  eventUserId?: string; // Event owner's ID
  isSaved?: boolean; // Whether current user has saved this event
}

// iOS detection function
function isIOS(): boolean {
  if (typeof window === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function SaveButton({
  eventId,
  event,
  type = "button",
  className = "",
  userId,
  eventUserId,
  isSaved = false,
}: SaveButtonProps) {
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsIOSDevice(isIOS());
  }, []);

  // Determine if current user owns this event
  const isOwner = userId && eventUserId && userId === eventUserId;

  const appStoreUrl =
    "https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216?itscg=30200&itsct=apps_box_badge&mttnsubad=6670222216";

  const handleSaveClick = async () => {
    if (!isIOSDevice) return;

    try {
      // Create deep link to the event
      const deepLink = createDeepLink(`event/${eventId}`);

      // Check if we're in development
      const isDev = process.env.NODE_ENV !== "production";

      // Use window.location instead of window.open to avoid popup blockers
      // Try the deep link first, then fallback to App Store
      window.location.href = deepLink;

      // In development, don't redirect to App Store since we're using dev build
      if (!isDev) {
        // Set a fallback timer in case the deep link doesn't work
        setTimeout(() => {
          // Only redirect to App Store if we're still on the same page
          if (!document.hidden) {
            window.location.href = appStoreUrl;
          }
        }, 2000);
      } else {
        // In development, just show a helpful message
        setTimeout(() => {
          if (!document.hidden) {
            toast(
              "Deep link attempted. Make sure you have the development app installed and running.",
            );
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to open app or App Store:", error);
      const isDev = process.env.NODE_ENV !== "production";

      if (!isDev) {
        // Fallback to App Store in production
        window.location.href = appStoreUrl;
      } else {
        // In development, show helpful message
        toast(
          "Failed to open development app. Make sure it's installed and the deep link scheme is configured correctly.",
        );
      }
    }
  };

  const handleShareClick = async () => {
    if (!event) return;

    const isAllDay = event.startTime && event.endTime ? false : true;
    const shareText = isAllDay
      ? `(${event.startDate || ""}, ${event.location || ""}) ${event.description || ""}`
      : `(${event.startDate || ""} ${event.startTime || ""}-${event.endTime || ""}, ${event.location || ""}) ${event.description || ""}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${event.name || "Event"} | Soonlist`,
          text: shareText,
          url: `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${eventId}`,
        });
      } catch {
        // User cancelled or error occurred, fallback to clipboard
        await handleClipboardShare();
      }
    } else {
      await handleClipboardShare();
    }
  };

  const handleClipboardShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/event/${eventId}`,
      );
      toast("Event URL copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error(
        "Failed to copy URL to clipboard. Please try again or copy the URL manually.",
      );
    }
  };

  // Determine button behavior based on ownership, save state, and platform
  // Logic:
  // 1. If user owns event OR already saved → always show Share
  // 2. If iOS and not owned and not saved → show Save (deep link)
  // 3. Otherwise → show Share
  const shouldShowShare = isOwner || isSaved || !isIOSDevice;

  const handleClick = shouldShowShare ? handleShareClick : handleSaveClick;
  const icon = shouldShowShare ? Share : Bookmark;
  const label = shouldShowShare ? "Share" : "Save to Soonlist";
  const text = shouldShowShare ? "Share" : "Save";

  if (type === "icon") {
    const IconComponent = icon;
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`rounded-full bg-interactive-2 p-3 ${className}`}
        aria-label={label}
      >
        <IconComponent className="size-4 text-interactive-1" />
      </button>
    );
  }

  const IconComponent = icon;
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 bg-interactive-2 px-3 py-2 ${className}`}
      style={{ borderRadius: 14 }}
      aria-label={label}
    >
      <IconComponent className="size-4 text-interactive-1" />
      <span className="text-sm font-bold text-interactive-1">{text}</span>
    </button>
  );
}
