/**
 * Utility functions for batch image processing
 */

/**
 * Maximum number of images allowed in a single batch
 */
export const MAX_BATCH_SIZE = 20;

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
