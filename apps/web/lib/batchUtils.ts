
export const MAX_BATCH_SIZE = 20;

export function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

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

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export interface BatchImage {
  tempId: string;
  base64Image: string;
  file?: File;
  status?: "pending" | "processing" | "success" | "error";
  error?: string;
}

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
