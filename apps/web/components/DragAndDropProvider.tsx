"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { BatchUploadProgress } from "~/components/BatchUploadProgress";
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

  const { isDragging, imageCount, currentBatchId } = useDragAndDropHandler({
    enabled: shouldEnable,
    onSuccess: (_batchId) => {
      toast.success(
        `${imageCount > 1 ? `${imageCount} images` : "Image"} received! Creating your ${imageCount > 1 ? "events" : "event"}...`,
      );
    },
    onError: (error) => {
      toast.error(`Failed to process images: ${error.message}`);
    },
  });

  // Track batch progress
  const batchProgress = useBatchProgress({
    batchId: currentBatchId,
  });

  return (
    <>
      {children}
      {/* Drag overlay - shown when dragging files over the page */}
      {isDragging && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-interactive-1/10 transition-all duration-200"
          style={{
            backdropFilter: "blur(2px)",
          }}
        >
          <div className="flex flex-col items-center gap-4 rounded-xl border-4 border-dashed border-interactive-1 bg-white/90 p-8 shadow-2xl dark:bg-gray-900/90">
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
          </div>
        </div>
      )}

      {/* Batch upload progress indicator */}
      {batchProgress && batchProgress.status === "processing" && (
        <BatchUploadProgress batch={batchProgress} />
      )}
    </>
  );
}
