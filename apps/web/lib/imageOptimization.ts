import resize from "@jsquash/resize";
import { encode } from "@jsquash/webp";

// Constants for default values
const DEFAULT_THUMBNAIL_WIDTH = 640;
const DEFAULT_THUMBNAIL_QUALITY = 0.5;
const DEFAULT_DISPLAY_WIDTH = 1284;
const DEFAULT_DISPLAY_QUALITY = 0.8;

/**
 * Efficiently converts ArrayBuffer to base64 string.
 * Uses chunked processing to avoid memory issues with large buffers.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  const chunks: string[] = [];

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...chunk));
  }

  return btoa(chunks.join(""));
}

/**
 * Validates image optimization parameters.
 */
function validateParameters(maxWidth: number, quality: number): void {
  if (maxWidth <= 0) {
    throw new Error("maxWidth must be a positive number");
  }
  if (quality < 0 || quality > 1) {
    throw new Error("quality must be between 0 and 1");
  }
}

/**
 * Gets ImageData from a URL or File.
 *
 * @param source - The image source (URL string or File object)
 * @returns Promise resolving to ImageData
 * @throws Error if the image fails to load
 */
async function getImageData(source: string | File): Promise<ImageData> {
  const img = new Image();
  const objectUrl =
    source instanceof File ? URL.createObjectURL(source) : source;

  try {
    // Only set crossOrigin for URLs, not for object URLs
    if (typeof source === "string" && !source.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = objectUrl;
    });

    // Create canvas to extract ImageData
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
      alpha: true,
    });

    if (!ctx) {
      throw new Error("Failed to get canvas 2D context");
    }

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    // Clean up
    canvas.width = 0;
    canvas.height = 0;
    img.src = "";

    return imageData;
  } catch (error) {
    throw new Error(
      `Failed to get image data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    // Always revoke object URLs
    if (source instanceof File) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

/**
 * Internal function to optimize image data to base64.
 * Shared logic for both URL and File inputs.
 */
async function optimizeToBase64Internal(
  source: string | File,
  maxWidth: number,
  quality: number,
): Promise<string> {
  validateParameters(maxWidth, quality);

  try {
    const imageData = await getImageData(source);
    const { width: originalWidth, height: originalHeight } = imageData;

    // Calculate new dimensions while maintaining aspect ratio
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;
    if (originalWidth > maxWidth) {
      const aspectRatio = originalHeight / originalWidth;
      targetWidth = maxWidth;
      targetHeight = Math.round(targetWidth * aspectRatio);
    }

    // Resize if needed
    const resizedData =
      targetWidth === originalWidth && targetHeight === originalHeight
        ? imageData
        : await resize(imageData, {
            width: targetWidth,
            height: targetHeight,
          });

    // Encode to WebP using jsquash
    const webpBuffer = await encode(resizedData, {
      quality: quality * 100,
    });
    return arrayBufferToBase64(webpBuffer);
  } catch (error) {
    throw new Error(
      `Image optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Optimize image for upload by resizing and compressing.
 * Similar to the Expo app's optimizeImage function.
 *
 * @param imageUrl - The URL of the image to optimize
 * @param maxWidth - Maximum width in pixels (default: 640)
 * @param quality - Compression quality between 0 and 1 (default: 0.5)
 * @returns Promise resolving to base64 encoded image string
 * @throws Error if optimization fails
 */
export async function optimizeImageToBase64(
  imageUrl: string,
  maxWidth = DEFAULT_THUMBNAIL_WIDTH,
  quality = DEFAULT_THUMBNAIL_QUALITY,
): Promise<string> {
  return optimizeToBase64Internal(imageUrl, maxWidth, quality);
}

/**
 * Optimize image file directly to base64 for event creation.
 * Matches the Expo app's direct file processing approach.
 *
 * @param file - The File object to optimize
 * @param maxWidth - Maximum width in pixels (default: 640)
 * @param quality - Compression quality between 0 and 1 (default: 0.5)
 * @returns Promise resolving to base64 encoded image string
 * @throws Error if optimization fails
 */
export async function optimizeFileToBase64(
  file: File,
  maxWidth = DEFAULT_THUMBNAIL_WIDTH,
  quality = DEFAULT_THUMBNAIL_QUALITY,
): Promise<string> {
  return optimizeToBase64Internal(file, maxWidth, quality);
}

/**
 * Convert image URL to base64 without optimization.
 * Fallback for browsers that don't support WebP or when optimization fails.
 *
 * @param url - The URL of the image to convert
 * @returns Promise resolving to base64 encoded image string
 * @throws Error if conversion fails
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix to get just the base64 string
          const base64 = reader.result.split(",")[1];
          if (!base64) {
            reject(new Error("Failed to extract base64 from data URL"));
          } else {
            resolve(base64);
          }
        } else {
          reject(new Error("FileReader did not return a string"));
        }
      };

      reader.onerror = () => {
        reject(new Error("FileReader failed to read blob"));
      };

      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw new Error(
      `Failed to convert image URL to base64: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Optimize image for high-quality display (event edit page).
 * Similar to the Expo app's event edit image processing.
 *
 * @param file - The File object to optimize
 * @param maxWidth - Maximum width in pixels (default: 1284)
 * @param quality - Compression quality between 0 and 1 (default: 0.8)
 * @returns Promise resolving to optimized image Blob
 * @throws Error if optimization fails
 */
export async function optimizeImageForDisplay(
  file: File,
  maxWidth = DEFAULT_DISPLAY_WIDTH,
  quality = DEFAULT_DISPLAY_QUALITY,
): Promise<Blob> {
  validateParameters(maxWidth, quality);

  try {
    const imageData = await getImageData(file);
    const { width: originalWidth, height: originalHeight } = imageData;

    // Calculate new dimensions while maintaining aspect ratio
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;
    if (originalWidth > maxWidth) {
      const aspectRatio = originalHeight / originalWidth;
      targetWidth = maxWidth;
      targetHeight = Math.round(targetWidth * aspectRatio);
    }

    // Resize if needed
    const resizedData =
      targetWidth === originalWidth && targetHeight === originalHeight
        ? imageData
        : await resize(imageData, {
            width: targetWidth,
            height: targetHeight,
          });

    // Encode to WebP
    const webpBuffer = await encode(resizedData, {
      quality: quality * 100,
    });

    return new Blob([webpBuffer], { type: "image/webp" });
  } catch (error) {
    throw new Error(
      `Failed to optimize image for display: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
