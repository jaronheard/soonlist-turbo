"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { TimezoneContext } from "~/context/TimezoneContext";
import { useBatchStore } from "~/hooks/useBatchStore";
import {
  generateBatchId,
  generateTempId,
  validateImageCount,
} from "~/lib/batchUtils";
import { DEFAULT_VISIBILITY } from "~/lib/constants";
import { optimizeFileToBase64 } from "~/lib/imageOptimization";
import {
  extractFilesFromClipboard,
  getNavigationPath,
  getPageContext,
  isValidImageFile,
  shouldHandlePasteEvent,
} from "~/lib/pasteEventUtils";

interface UseImagePasteHandlerOptions {
  enabled?: boolean;
  onSuccess?: (batchId: string) => void;
  onError?: (error: Error) => void;
}

interface UseImagePasteHandlerReturn {
  isProcessing: boolean;
  error: string | null;
  lastProcessedImage: string | null;
}

export function useImagePasteHandler(
  options: UseImagePasteHandlerOptions = {},
): UseImagePasteHandlerReturn {
  const { enabled = true, onSuccess, onError } = options;
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedImage, setLastProcessedImage] = useState<string | null>(
    null,
  );

  const isProcessingRef = useRef(false);

  const createEventBatch = useMutation(api.ai.createEventBatch);
  const addBatchId = useBatchStore((state) => state.addBatchId);

  const shouldHandlePasteEventInternal = useCallback(
    (event: ClipboardEvent): boolean => {
      if (!enabled) return false;

      if (!currentUser) return false;

      if (isProcessing) return false;

      return shouldHandlePasteEvent(event);
    },
    [enabled, currentUser, isProcessing],
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      try {
        if (!shouldHandlePasteEventInternal(event)) return;

        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        const clipboardData = event.clipboardData;
        if (!clipboardData) {
          isProcessingRef.current = false;
          return;
        }

        const images = extractFilesFromClipboard(clipboardData);
        if (images.length === 0) {
          isProcessingRef.current = false;
          return;
        }

        if (!currentUser) {
          isProcessingRef.current = false;
          return;
        }

        const validation = validateImageCount(images.length);
        if (!validation.valid) {
          setError(validation.error ?? "Invalid image count");
          isProcessingRef.current = false;
          onError?.(new Error(validation.error ?? "Invalid image count"));
          return;
        }

        const validImages = images.filter((img) => isValidImageFile(img));
        const invalidImages = images.filter((img) => !isValidImageFile(img));

        if (invalidImages.length > 0) {
          toast.error(
            `${invalidImages.length} ${invalidImages.length === 1 ? "file has" : "files have"} unsupported format${invalidImages.length === 1 ? "" : "s"}`,
            {
              duration: 6000, // Increased duration for error toasts
            },
          );
        }

        if (validImages.length === 0) {
          setError("No valid images to process");
          isProcessingRef.current = false;
          return;
        }

        const finalValidation = validateImageCount(validImages.length);
        if (!finalValidation.valid) {
          toast.error(finalValidation.error ?? "Invalid image count", {
            duration: 6000,
          });
          setError(finalValidation.error ?? "Invalid image count");
          isProcessingRef.current = false;
          onError?.(new Error(finalValidation.error ?? "Invalid image count"));
          return;
        }

        event.preventDefault();

        setIsProcessing(true);
        setError(null);

        const batchId = generateBatchId();
        const batchImages = await Promise.all(
          validImages.map(async (image) => {
            const base64Image = await optimizeFileToBase64(image, 640, 0.5);
            return {
              base64Image,
              tempId: generateTempId(),
            };
          }),
        );

        if (batchImages.length > 0 && batchImages[0]) {
          setLastProcessedImage(batchImages[0].base64Image);
        }

        const result = await createEventBatch({
          batchId,
          images: batchImages,
          timezone,
          userId: currentUser.id,
          username: currentUser.username || currentUser.id,
          sendNotification: false,
          visibility: DEFAULT_VISIBILITY,
          lists: [],
        });

        if (result.batchId) {
          addBatchId(result.batchId);

          onSuccess?.(result.batchId);

          const pageContext = getPageContext(pathname);
          const navigationPath = getNavigationPath(
            pageContext,
            pathname,
            currentUser.username || currentUser.id,
          );
          router.push(navigationPath);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to process images";
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
        console.error("Error processing pasted images:", err);
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [
      shouldHandlePasteEventInternal,
      currentUser,
      timezone,
      createEventBatch,
      addBatchId,
      onSuccess,
      onError,
      router,
      pathname,
    ],
  );

  useEffect(() => {
    if (!enabled) return;

    const pasteListener = (event: ClipboardEvent) => {
      void handlePaste(event);
    };

    document.addEventListener("paste", pasteListener);

    return () => {
      document.removeEventListener("paste", pasteListener);
    };
  }, [enabled, handlePaste]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    isProcessing,
    error,
    lastProcessedImage,
  };
}
