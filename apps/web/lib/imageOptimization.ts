import resize from "@jsquash/resize";
import { encode } from "@jsquash/webp";

/**
 * Optimize image for upload by resizing and compressing
 * Similar to the Expo app's optimizeImage function
 */
export async function optimizeImageToBase64(
  imageUrl: string,
  maxWidth = 640,
  quality = 0.5,
): Promise<string> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Create image element to get dimensions
    const img = new Image();
    img.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(blob);
    });

    // Calculate new dimensions
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      const aspectRatio = height / width;
      width = maxWidth;
      height = Math.round(width * aspectRatio);
    }

    // Clean up object URL
    URL.revokeObjectURL(img.src);

    // Create canvas to get ImageData
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw original image
    img.src = imageUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    // Resize if needed
    let resizedImageData = imageData;
    if (width !== img.width || height !== img.height) {
      resizedImageData = await resize(imageData, { width, height });
    }

    // Encode to WebP using jsquash
    const webpBuffer = await encode(resizedImageData, {
      quality: quality * 100,
    });

    // Convert ArrayBuffer to base64
    const base64 = btoa(
      Array.from(new Uint8Array(webpBuffer))
        .map((byte) => String.fromCharCode(byte))
        .join(""),
    );

    return base64;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Optimize image file directly to base64 for event creation
 * Matches the Expo app's direct file processing approach
 */
export async function optimizeFileToBase64(
  file: File,
  maxWidth = 640,
  quality = 0.5,
): Promise<string> {
  try {
    // Create image element to get dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = objectUrl;
    });

    // Calculate new dimensions
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      const aspectRatio = height / width;
      width = maxWidth;
      height = Math.round(width * aspectRatio);
    }

    // Clean up object URL
    URL.revokeObjectURL(objectUrl);

    // Create canvas to get ImageData
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw original image from file
    const imgForDraw = new Image();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    imgForDraw.src = dataUrl;
    await new Promise((resolve) => {
      imgForDraw.onload = resolve;
    });

    ctx.drawImage(imgForDraw, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    // Resize if needed
    let resizedImageData = imageData;
    if (width !== img.width || height !== img.height) {
      resizedImageData = await resize(imageData, { width, height });
    }

    // Encode to WebP using jsquash
    const webpBuffer = await encode(resizedImageData, {
      quality: quality * 100,
    });

    // Convert ArrayBuffer to base64
    const base64 = btoa(
      Array.from(new Uint8Array(webpBuffer))
        .map((byte) => String.fromCharCode(byte))
        .join(""),
    );

    return base64;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Convert image URL to base64 without optimization
 * Fallback for browsers that don't support WebP
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          // Remove the data URL prefix to get just the base64 string
          const base64 = reader.result.split(",")[1];
          resolve(base64 || "");
        } else {
          reject(new Error("Failed to convert to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
}

/**
 * Optimize image for high-quality display (event edit page)
 * Similar to the Expo app's event edit image processing
 */
export async function optimizeImageForDisplay(
  file: File,
  maxWidth = 1284,
  quality = 0.8,
): Promise<Blob> {
  try {
    // Create image element to get dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = objectUrl;
    });

    // Calculate new dimensions
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      const aspectRatio = height / width;
      width = maxWidth;
      height = Math.round(width * aspectRatio);
    }

    // Clean up object URL
    URL.revokeObjectURL(objectUrl);

    // Create canvas to get ImageData
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Draw original image from file
    const imgForDraw = new Image();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    imgForDraw.src = dataUrl;
    await new Promise((resolve) => {
      imgForDraw.onload = resolve;
    });

    ctx.drawImage(imgForDraw, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    // Resize if needed
    let resizedImageData = imageData;
    if (width !== img.width || height !== img.height) {
      resizedImageData = await resize(imageData, { width, height });
    }

    // For display, we'll still use JPEG via canvas since it's widely supported
    // Create a new canvas with the resized dimensions
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = resizedImageData.width;
    outputCanvas.height = resizedImageData.height;
    const outputCtx = outputCanvas.getContext("2d");

    if (!outputCtx) {
      throw new Error("Failed to get output canvas context");
    }

    // Put the resized image data
    outputCtx.putImageData(resizedImageData, 0, 0);

    // Convert to JPEG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to convert canvas to blob"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        quality,
      );
    });

    return blob;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}
