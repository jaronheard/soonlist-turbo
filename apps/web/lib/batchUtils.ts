/**
 * Utility functions for batch image processing
 */

/**
 * Maximum number of images allowed in a single batch
 */
export const MAX_BATCH_SIZE = 20;

/**
 * SessionStorage key for persisting batchId across layout transitions.
 * When navigating from /new (minimal layout) to /upcoming (base layout),
 * the DragAndDropProvider unmounts and remounts, losing in-memory state.
 * This key allows the new provider instance to pick up the pending batchId.
 */
export const PENDING_BATCH_ID_KEY = "soonlist:pendingBatchId";

/**
 * Generates a unique batch ID for tracking batch operations
 */
export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generates a unique temporary ID for tracking individual images within a batch
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validates that the image count is within acceptable limits
 */
export function validateImageCount(count: number): {
  valid: boolean;
  error?: string;
} {
  if (count === 0) {
    return {
      valid: false,
      error: "No images provided",
    };
  }

  if (count > MAX_BATCH_SIZE) {
    return {
      valid: false,
      error: `Maximum ${MAX_BATCH_SIZE} images allowed at once. You provided ${count} images.`,
    };
  }

  return { valid: true };
}

/**
 * Splits an array of items into chunks of specified size
 * Useful for processing images in smaller batches if needed
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Type for an image in a batch with its metadata
 */
export interface BatchImage {
  tempId: string;
  base64Image: string;
  file?: File;
  status?: "pending" | "processing" | "success" | "error";
  error?: string;
}

/**
 * Type for batch upload state
 */
export interface BatchUploadState {
  batchId: string;
  images: BatchImage[];
  totalCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  status: "idle" | "uploading" | "processing" | "complete" | "error";
  startedAt?: number;
  completedAt?: number;
}

/**
 * Creates initial batch state
 */
export function createBatchState(
  batchId: string,
  images: BatchImage[],
): BatchUploadState {
  return {
    batchId,
    images,
    totalCount: images.length,
    processedCount: 0,
    successCount: 0,
    errorCount: 0,
    status: "idle",
    startedAt: Date.now(),
  };
}
