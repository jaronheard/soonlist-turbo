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
  MAX_BATCH_SIZE,
  validateImageCount,
} from "~/lib/batchUtils";
import { DEFAULT_VISIBILITY } from "~/lib/constants";
import { optimizeFileToBase64 } from "~/lib/imageOptimization";
import {
  extractFilesFromDataTransfer,
  getNavigationPath,
  getPageContext,
  hasFiles,
  isValidImageFile,
} from "~/lib/pasteEventUtils";

interface UseDragAndDropHandlerOptions {
  enabled?: boolean;
  onSuccess?: (batchId: string) => void;
  onError?: (error: Error) => void;
}

interface UseDragAndDropHandlerReturn {
  isDragging: boolean;
  isProcessing: boolean;
  error: string | null;
  lastProcessedImage: string | null;
  imageCount: number;
  hasValidationError: boolean;
}

export function useDragAndDropHandler(
  options: UseDragAndDropHandlerOptions = {},
): UseDragAndDropHandlerReturn {
  const { enabled = true, onSuccess, onError } = options;
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useQuery(api.users.getCurrentUser);
  const { timezone } = useContext(TimezoneContext);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedImage, setLastProcessedImage] = useState<string | null>(
    null,
  );
  const [imageCount, setImageCount] = useState(0);
  const [hasValidationError, setHasValidationError] = useState(false);

  const dragCounterRef = useRef(0);

  const isProcessingRef = useRef(false);

  const createEventBatch = useMutation(api.ai.createEventBatch);
  const addBatchId = useBatchStore((state) => state.addBatchId);

  const handleDragEnter = useCallback(
    (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      dragCounterRef.current += 1;

      if (event.dataTransfer && hasFiles(event.dataTransfer)) {
        if (dragCounterRef.current === 1) {
          setIsDragging(true);
          const items = event.dataTransfer.items;
          if (items) {
            let count = 0;
            for (const item of items) {
              if (item?.kind === "file") {
                count++;
              }
            }
            setImageCount(count);

            if (count > MAX_BATCH_SIZE) {
              setHasValidationError(true);
            } else {
              setHasValidationError(false);
            }
          }
        }
      }
    },
    [enabled, currentUser],
  );

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.dataTransfer && hasFiles(event.dataTransfer)) {
        event.dataTransfer.dropEffect = "copy";
      }
    },
    [enabled, currentUser],
  );

  const handleDragLeave = useCallback(
    (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      dragCounterRef.current -= 1;

      if (dragCounterRef.current === 0) {
        setIsDragging(false);
        setImageCount(0);
        setHasValidationError(false);
      }
    },
    [enabled, currentUser],
  );

  const handleDrop = useCallback(
    async (event: DragEvent) => {
      if (!enabled || !currentUser) return;

      event.preventDefault();
      event.stopPropagation();

      dragCounterRef.current = 0;
      setIsDragging(false);
      setImageCount(0);

      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setIsProcessing(true);

      try {
        const dataTransfer = event.dataTransfer;
        if (!dataTransfer) {
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        const images = extractFilesFromDataTransfer(dataTransfer);
        if (images.length === 0) {
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        const validation = validateImageCount(images.length);
        if (!validation.valid) {
          toast.error(validation.error ?? "Invalid image count", {
            duration: 6000,
          });
          setError(validation.error ?? "Invalid image count");
          isProcessingRef.current = false;
          setIsProcessing(false);
          onError?.(new Error(validation.error ?? "Invalid image count"));
          return;
        }

        const validImages = images.filter((img) => isValidImageFile(img));
        const invalidImages = images.filter((img) => !isValidImageFile(img));

        if (invalidImages.length > 0) {
          toast.error(
            `${invalidImages.length} ${invalidImages.length === 1 ? "file has" : "files have"} unsupported format${invalidImages.length === 1 ? "" : "s"}`,
            {
              duration: 6000,
            },
          );
        }

        if (validImages.length === 0) {
          setError("No valid images to process");
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        const finalValidation = validateImageCount(validImages.length);
        if (!finalValidation.valid) {
          toast.error(finalValidation.error ?? "Invalid image count", {
            duration: 6000,
          });
          setError(finalValidation.error ?? "Invalid image count");
          isProcessingRef.current = false;
          setIsProcessing(false);
          onError?.(new Error(finalValidation.error ?? "Invalid image count"));
          return;
        }

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
        console.error("Error processing dropped images:", err);
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [
      enabled,
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

    const dragEnterListener = (event: DragEvent) => {
      handleDragEnter(event);
    };

    const dragOverListener = (event: DragEvent) => {
      handleDragOver(event);
    };

    const dragLeaveListener = (event: DragEvent) => {
      handleDragLeave(event);
    };

    const dropListener = (event: DragEvent) => {
      void handleDrop(event);
    };

    document.addEventListener("dragenter", dragEnterListener as EventListener);
    document.addEventListener("dragover", dragOverListener as EventListener);
    document.addEventListener("dragleave", dragLeaveListener as EventListener);
    document.addEventListener("drop", dropListener as EventListener);

    return () => {
      document.removeEventListener(
        "dragenter",
        dragEnterListener as EventListener,
      );
      document.removeEventListener(
        "dragover",
        dragOverListener as EventListener,
      );
      document.removeEventListener(
        "dragleave",
        dragLeaveListener as EventListener,
      );
      document.removeEventListener("drop", dropListener as EventListener);
    };
  }, [enabled, handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    isDragging,
    isProcessing,
    error,
    lastProcessedImage,
    imageCount,
    hasValidationError,
  };
}
