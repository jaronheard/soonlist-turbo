"use client";

import { useEffect } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { BatchUploadState } from "~/lib/batchUtils";

interface BatchUploadProgressProps {
  batch: BatchUploadState | null;
  onComplete?: () => void;
}

/**
 * Component to display batch upload progress
 * Shows aggregate progress with simple feedback
 */
export function BatchUploadProgress({
  batch,
  onComplete,
}: BatchUploadProgressProps) {
  // Show toast notifications based on batch status
  useEffect(() => {
    if (!batch) return;

    if (batch.status === "complete") {
      const hasErrors = batch.errorCount > 0;

      if (hasErrors) {
        toast.error(
          `Batch complete: ${batch.successCount} succeeded, ${batch.errorCount} failed`,
          {
            duration: 5000,
          },
        );
      } else {
        toast.success(
          `Successfully processed ${batch.successCount} ${batch.successCount === 1 ? "image" : "images"}!`,
          {
            duration: 4000,
          },
        );
      }

      // Call completion callback after a short delay
      setTimeout(() => {
        onComplete?.();
      }, 1000);
    } else if (batch.status === "error") {
      toast.error("Batch processing failed. Please try again.", {
        duration: 5000,
      });

      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  }, [batch?.status, batch?.successCount, batch?.errorCount, onComplete]);

  if (!batch || batch.status === "idle") return null;

  const progress =
    batch.totalCount > 0
      ? Math.round((batch.processedCount / batch.totalCount) * 100)
      : 0;

  const isProcessing =
    batch.status === "uploading" || batch.status === "processing";
  const isComplete = batch.status === "complete";
  const isError = batch.status === "error";

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-neutral-3 bg-white p-4 shadow-lg dark:bg-gray-800">
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5">
          {isProcessing && (
            <Loader2 className="h-5 w-5 animate-spin text-interactive-1" />
          )}
          {isComplete && batch.errorCount === 0 && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
          {(isError || (isComplete && batch.errorCount > 0)) && (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isProcessing &&
                `Processing ${batch.totalCount} ${batch.totalCount === 1 ? "image" : "images"}...`}
              {isComplete && batch.errorCount === 0 && "Upload complete!"}
              {isComplete && batch.errorCount > 0 && "Upload complete with errors"}
              {isError && "Upload failed"}
            </p>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {progress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-interactive-1 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress Stats */}
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              {batch.processedCount} of {batch.totalCount} processed
            </span>
            {batch.errorCount > 0 && (
              <span className="text-red-600">
                {batch.errorCount}{" "}
                {batch.errorCount === 1 ? "error" : "errors"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

