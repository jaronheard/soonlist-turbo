"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useBatchProgress } from "~/hooks/useBatchProgress";
import { useDragAndDropHandler } from "~/hooks/useDragAndDropHandler";
import { isTargetPage } from "~/lib/pasteEventUtils";

interface DragAndDropProviderProps {
  children: React.ReactNode;
}

export function DragAndDropProvider({ children }: DragAndDropProviderProps) {
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);

  // Only enable the drag and drop handler on target pages and when user is authenticated
  const shouldEnable = isTargetPage(pathname) && !!currentUser;

  const { isDragging, imageCount, currentBatchId, hasValidationError } =
    useDragAndDropHandler({
      enabled: shouldEnable,
      onError: (error) => {
        toast.error(`Failed to process images: ${error.message}`, {
          duration: 6000, // Increased duration for error toasts
        });
      },
    });

  // Track batch progress with toast notifications
  useBatchProgress({
    batchId: currentBatchId,
  });

  return (
    <>
      {children}
      {/* Drag overlay - shown when dragging files over the page */}
      {isDragging && (
        <div
          className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
            hasValidationError ? "bg-red-500/10" : "bg-interactive-1/10"
          }`}
          style={{
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            className={`flex flex-col items-center gap-4 rounded-xl border-4 border-dashed p-8 shadow-2xl ${
              hasValidationError
                ? "border-red-500 bg-white/90 dark:bg-gray-900/90"
                : "border-interactive-1 bg-white/90 dark:bg-gray-900/90"
            }`}
          >
            {hasValidationError ? (
              <>
                <X className="h-16 w-16 text-red-500" />
                <div className="text-center">
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                    Too many images!
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Maximum 20 images allowed. You have {imageCount} images.
                  </p>
                </div>
              </>
            ) : (
              <>
                <ImagePlus className="h-16 w-16 animate-bounce text-interactive-1" />
                <div className="text-center">
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {imageCount > 1
                      ? `Drop ${imageCount} images to create events`
                      : "Drop images to create events"}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {imageCount > 0
                      ? `Release to process ${imageCount > 1 ? `${imageCount} images` : "your image"}`
                      : "Up to 20 images at once"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
