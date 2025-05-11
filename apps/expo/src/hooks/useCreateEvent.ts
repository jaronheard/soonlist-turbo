import { useCallback } from "react";

export interface CreateEventOptions {
  imageUri: string;
  userId: string;
  username: string;
  queueItemId?: string;
}

interface UseCreateEventOptions {
  onProgress?: (progress: number, queueItemId?: string) => void;
  onSuccess?: (result: any, queueItemId?: string) => void;
  onError?: (error: Error, queueItemId?: string) => void;
}

export function useCreateEvent({
  onProgress,
  onSuccess,
  onError,
}: UseCreateEventOptions = {}) {
  const createEvent = useCallback(
    async ({ imageUri, queueItemId, userId, username }: CreateEventOptions) => {
      try {
        // Simulate upload progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 0.1;
          if (progress > 0.9) {
            clearInterval(interval);
          }
          onProgress?.(progress, queueItemId);
        }, 500);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 5000));
        
        clearInterval(interval);
        onProgress?.(1, queueItemId);
        
        // Simulate success
        const result = { id: "event-" + Date.now(), imageUri, userId, username };
        onSuccess?.(result, queueItemId);
        return result;
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)), queueItemId);
        throw error;
      }
    },
    [onProgress, onSuccess, onError]
  );

  return { createEvent };
}

