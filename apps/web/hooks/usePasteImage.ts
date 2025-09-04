"use client";

import { useCallback, useEffect, useRef } from "react";

interface UsePasteImageOptions {
  onImagePaste: (file: File) => void;
  enabled?: boolean;
}

/**
 * Custom hook to handle image paste functionality from clipboard
 * Converts clipboard image data to File objects for processing
 */
export function usePasteImage({
  onImagePaste,
  enabled = true,
}: UsePasteImageOptions) {
  const elementRef = useRef<HTMLDivElement>(null);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!enabled) return;

      // Prevent default paste behavior
      event.preventDefault();

      const clipboardItems = event.clipboardData?.items;
      if (!clipboardItems) return;

      // Look for image items in clipboard
      for (const item of clipboardItems) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            // Convert blob to File object with a proper name
            const file = new File(
              [blob],
              `pasted-image-${Date.now()}.${getFileExtension(item.type)}`,
              {
                type: item.type,
                lastModified: Date.now(),
              },
            );

            onImagePaste(file);
            return; // Process only the first image found
          }
        }
      }
    },
    [onImagePaste, enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    if (!element) return;

    // Make element focusable if it isn't already
    if (!element.hasAttribute("tabindex")) {
      element.setAttribute("tabindex", "-1");
    }

    element.addEventListener("paste", handlePaste);

    return () => {
      element.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste, enabled]);

  // Also listen for global paste events when the element is focused
  useEffect(() => {
    if (!enabled) return;

    const handleGlobalPaste = (event: ClipboardEvent) => {
      const element = elementRef.current;
      if (!element) return;

      // Only handle paste if our element or its children have focus
      if (
        element.contains(document.activeElement) ||
        element === document.activeElement
      ) {
        handlePaste(event);
      }
    };

    document.addEventListener("paste", handleGlobalPaste);

    return () => {
      document.removeEventListener("paste", handleGlobalPaste);
    };
  }, [handlePaste, enabled]);

  return { elementRef };
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
  };

  return mimeToExt[mimeType] || "png";
}
