"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";

import { Button } from "@soonlist/ui/button";

interface SaveToSoonButtonProps {
  eventId: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  type?: "button" | "icon";
}

const APP_STORE_URL = "https://apps.apple.com/us/app/soonlist/id6467723160";

export function SaveToSoonButton({
  eventId,
  variant = "default",
  size = "default",
  className,
  type = "button",
}: SaveToSoonButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isIOS = () => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  const handleSaveToSoon = () => {
    setIsLoading(true);

    // Check if we're on iOS
    if (!isIOS()) {
      // Not on iOS, go directly to App Store
      window.open(APP_STORE_URL, "_blank");
      setIsLoading(false);
      return;
    }

    // Try universal link first (works if app is installed)
    const universalLink = `https://soonlist.com/event/${eventId}`;

    // Create a timer to fallback to App Store
    const fallbackTimer = setTimeout(() => {
      window.location.href = APP_STORE_URL;
      setIsLoading(false);
    }, 2000);

    // Try to open the universal link
    try {
      window.location.href = universalLink;

      // If the app opens, the page will lose focus
      // Clear the fallback timer if we detect the app opened
      const visibilityChangeHandler = () => {
        if (document.visibilityState === "hidden") {
          clearTimeout(fallbackTimer);
          setIsLoading(false);
        }
      };

      document.addEventListener("visibilitychange", visibilityChangeHandler);

      // Clean up the event listener after a delay
      setTimeout(() => {
        document.removeEventListener(
          "visibilitychange",
          visibilityChangeHandler,
        );
      }, 3000);
    } catch (error) {
      console.error("Error opening app:", error);
      clearTimeout(fallbackTimer);
      window.location.href = APP_STORE_URL;
      setIsLoading(false);
    }
  };

  if (type === "icon") {
    return (
      <Button
        onClick={handleSaveToSoon}
        size="icon"
        variant={variant}
        className={className}
        disabled={isLoading}
        title="Save to Soon"
      >
        <Smartphone className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleSaveToSoon}
      variant={variant}
      size={size}
      className={className}
      disabled={isLoading}
    >
      <Smartphone className="mr-2 h-4 w-4" />
      {isLoading ? "Opening..." : "Save to Soon"}
    </Button>
  );
}
