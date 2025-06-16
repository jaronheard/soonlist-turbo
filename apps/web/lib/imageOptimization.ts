import resize from "@jsquash/resize";
import { encode } from "@jsquash/webp";

// Constants for default values
const DEFAULT_THUMBNAIL_WIDTH = 640;
const DEFAULT_THUMBNAIL_QUALITY = 0.5;
const DEFAULT_DISPLAY_WIDTH = 1284;
const DEFAULT_DISPLAY_QUALITY = 0.8;

/**
 * Converts ArrayBuffer to base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binaryString = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return btoa(binaryString);
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
 * Note: Canvas is required here to convert image sources to ImageData for jsquash.
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
    // Only set crossOrigin for external URLs
    if (typeof source === "string" && !source.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = objectUrl;
    });

    // Create minimal canvas just for ImageData extraction
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas 2D context");
    }

    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
  } finally {
    // Always revoke object URLs
    if (source instanceof File) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

/**
 * Optimizes image using jsquash and returns base64 string.
 */
async function optimizeToBase64Internal(
  source: string | File,
  maxWidth: number,
  quality: number,
): Promise<string> {
  validateParameters(maxWidth, quality);

  const imageData = await getImageData(source);
  const { width: originalWidth, height: originalHeight } = imageData;

  // Calculate new dimensions while maintaining aspect ratio
  const shouldResize = originalWidth > maxWidth;
  const resizedData = shouldResize
    ? await resize(imageData, {
        width: maxWidth,
        height: Math.round((originalHeight / originalWidth) * maxWidth),
      })
    : imageData;

  // Encode to WebP using jsquash
  const webpBuffer = await encode(resizedData, {
    quality: quality * 100,
  });
  
  return arrayBufferToBase64(webpBuffer);
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
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  
  return arrayBufferToBase64(arrayBuffer);
}

/**
 * Optimize image for high-quality display (event edit page).
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

  const imageData = await getImageData(file);
  const { width: originalWidth, height: originalHeight } = imageData;

  // Resize if needed
  const shouldResize = originalWidth > maxWidth;
  const resizedData = shouldResize
    ? await resize(imageData, {
        width: maxWidth,
        height: Math.round((originalHeight / originalWidth) * maxWidth),
      })
    : imageData;

  // Encode to WebP using jsquash
  const webpBuffer = await encode(resizedData, {
    quality: quality * 100,
  });

  return new Blob([webpBuffer], { type: "image/webp" });
}
