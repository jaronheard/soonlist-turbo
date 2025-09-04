/**
 * Visual indicator to inform users they can paste images to create events
 */

"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { ImageIcon, Keyboard } from "lucide-react";

import { api } from "@soonlist/backend/convex/_generated/api";

interface PasteImageIndicatorProps {
  /** Whether the paste functionality is currently enabled */
  enabled?: boolean;
  /** Whether to show the indicator */
  show?: boolean;
  /** Custom className for styling */
  className?: string;
}

/**
 * Shows a subtle indicator that users can paste images to create events
 */
export function PasteImageIndicator({
  enabled = true,
  show = true,
  className = "",
}: PasteImageIndicatorProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const [isVisible, setIsVisible] = useState(false);

  // Only show if user is authenticated and feature is enabled
  const shouldShow = show && enabled && !!currentUser;

  // Show the indicator briefly when the component mounts, then fade it out
  useEffect(() => {
    if (shouldShow) {
      setIsVisible(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 
        transform transition-all duration-500 ease-in-out
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}
        ${className}
      `}
    >
      <div className="rounded-lg border bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ImageIcon className="size-4" />
          <span>Paste an image to create an event</span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Keyboard className="size-3" />
            <span>Ctrl+V</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage the paste indicator visibility
 */
export function usePasteIndicator() {
  const [showIndicator, setShowIndicator] = useState(true);

  const hideIndicator = () => setShowIndicator(false);
  const showIndicatorTemporarily = () => {
    setShowIndicator(true);
    setTimeout(() => setShowIndicator(false), 3000);
  };

  return {
    showIndicator,
    hideIndicator,
    showIndicatorTemporarily,
  };
}
