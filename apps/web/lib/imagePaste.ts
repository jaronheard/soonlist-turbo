/**
 * Utilities for handling image paste functionality
 * Converts clipboard images to optimized base64 format for event creation
 */

import { optimizeFileToBase64 } from "./imageOptimization";

// Maximum base64 size to prevent journal overflow (900KB to be safe with 1MB limit)
const MAX_BASE64_SIZE = 900 * 1024;

export interface PasteImageResult {
  base64Image: string;
  originalSize: number;
  optimizedSize: number;
}

export interface PasteImageError {
  type: "no-image" | "unsupported-format" | "too-large" | "processing-error";
  message: string;
}

/**
 * Error class that implements PasteImageError interface
 */
class PasteImageErrorImpl extends Error implements PasteImageError {
  public readonly type: PasteImageError["type"];

  constructor(message: string, type: PasteImageError["type"]) {
    super(message);
    this.name = "PasteImageError";
    this.type = type;
  }
}

/**
 * Creates a properly typed PasteImageError
 */
function createPasteImageError(
  type: PasteImageError["type"],
  message: string,
): PasteImageErrorImpl {
  return new PasteImageErrorImpl(message, type);
}

/**
 * Extracts image data from clipboard paste event
 */
export async function extractImageFromClipboard(
  event: ClipboardEvent,
): Promise<PasteImageResult> {
  const items = event.clipboardData?.items;
  if (!items) {
    throw createPasteImageError("no-image", "No clipboard data available");
  }

  // Find the first image item in clipboard
  let imageItem: DataTransferItem | null = null;
  for (const item of items) {
    if (item?.type.startsWith("image/")) {
      imageItem = item;
      break;
    }
  }

  if (!imageItem) {
    throw createPasteImageError("no-image", "No image found in clipboard");
  }

  // Convert clipboard item to file
  const file = imageItem.getAsFile();
  if (!file) {
    throw createPasteImageError(
      "processing-error",
      "Failed to extract image file from clipboard",
    );
  }

  // Check if it's a supported image format
  const supportedFormats = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/avif",
    "image/heic",
    "image/heif",
  ];

  if (!supportedFormats.includes(file.type)) {
    throw createPasteImageError(
      "unsupported-format",
      `Unsupported image format: ${file.type}`,
    );
  }

  const originalSize = file.size;

  try {
    // Optimize the image using the same settings as the existing upload flow
    // Width: 640px, Quality: 0.5, Format: WebP
    const base64Image = await optimizeFileToBase64(file, 640, 0.5);

    // Validate base64 size
    const optimizedSize = base64Image.length;
    if (optimizedSize > MAX_BASE64_SIZE) {
      throw createPasteImageError(
        "too-large",
        `Image too large after optimization: ${Math.round(optimizedSize / 1024)}KB (max ${Math.round(MAX_BASE64_SIZE / 1024)}KB). Please use a smaller image.`,
      );
    }

    return {
      base64Image,
      originalSize,
      optimizedSize,
    };
  } catch (error) {
    if (error && typeof error === "object" && "type" in error) {
      // Re-throw our custom errors
      throw error;
    }

    // Handle optimization errors
    throw createPasteImageError(
      "processing-error",
      error instanceof Error ? error.message : "Failed to process image",
    );
  }
}

/**
 * Checks if the current focused element should prevent paste handling
 */
export function shouldPreventPasteHandling(): boolean {
  const activeElement = document.activeElement;

  if (!activeElement) {
    return false;
  }

  // Prevent paste handling when user is typing in input fields
  const tagName = activeElement.tagName.toLowerCase();
  const inputTypes = ["input", "textarea", "select"];

  if (inputTypes.includes(tagName)) {
    return true;
  }

  // Check for contenteditable elements
  if (activeElement.getAttribute("contenteditable") === "true") {
    return true;
  }

  // Check for elements with role="textbox"
  if (activeElement.getAttribute("role") === "textbox") {
    return true;
  }

  return false;
}

/**
 * Checks if the browser supports the Clipboard API
 */
export function isClipboardAPISupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "clipboard" in navigator &&
    typeof navigator.clipboard.read === "function"
  );
}

/**
 * Alternative method to read clipboard using the modern Clipboard API
 * Falls back to paste event handling if not supported
 */
export async function readClipboardImage(): Promise<PasteImageResult> {
  if (!isClipboardAPISupported()) {
    throw new Error("Clipboard API not supported in this browser");
  }

  try {
    const clipboardItems = await navigator.clipboard.read();

    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith("image/")) {
          const blob = await clipboardItem.getType(type);
          const file = new File([blob], "pasted-image", { type });

          const originalSize = file.size;
          const base64Image = await optimizeFileToBase64(file, 640, 0.5);
          const optimizedSize = base64Image.length;

          if (optimizedSize > MAX_BASE64_SIZE) {
            throw createPasteImageError(
              "too-large",
              `Image too large after optimization: ${Math.round(optimizedSize / 1024)}KB (max ${Math.round(MAX_BASE64_SIZE / 1024)}KB)`,
            );
          }

          return {
            base64Image,
            originalSize,
            optimizedSize,
          };
        }
      }
    }

    throw createPasteImageError("no-image", "No image found in clipboard");
  } catch (error) {
    if (error && typeof error === "object" && "type" in error) {
      throw error;
    }

    throw createPasteImageError(
      "processing-error",
      error instanceof Error ? error.message : "Failed to read clipboard",
    );
  }
}
