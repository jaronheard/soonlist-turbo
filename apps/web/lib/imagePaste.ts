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
  type: 'no-image' | 'unsupported-format' | 'too-large' | 'processing-error';
  message: string;
}

/**
 * Extracts image data from clipboard paste event
 */
export async function extractImageFromClipboard(
  event: ClipboardEvent
): Promise<PasteImageResult> {
  const items = event.clipboardData?.items;
  if (!items) {
    throw new Error('No clipboard data available') as PasteImageError & { type: 'no-image' };
  }

  // Find the first image item in clipboard
  let imageItem: DataTransferItem | null = null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.type.startsWith('image/')) {
      imageItem = item;
      break;
    }
  }

  if (!imageItem) {
    const error = new Error('No image found in clipboard') as PasteImageError & { type: 'no-image' };
    error.type = 'no-image';
    throw error;
  }

  // Convert clipboard item to file
  const file = imageItem.getAsFile();
  if (!file) {
    const error = new Error('Failed to extract image file from clipboard') as PasteImageError & { type: 'processing-error' };
    error.type = 'processing-error';
    throw error;
  }

  // Check if it's a supported image format
  const supportedFormats = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/avif',
    'image/heic',
    'image/heif'
  ];

  if (!supportedFormats.includes(file.type)) {
    const error = new Error(`Unsupported image format: ${file.type}`) as PasteImageError & { type: 'unsupported-format' };
    error.type = 'unsupported-format';
    throw error;
  }

  const originalSize = file.size;

  try {
    // Optimize the image using the same settings as the existing upload flow
    // Width: 640px, Quality: 0.5, Format: WebP
    const base64Image = await optimizeFileToBase64(file, 640, 0.5);
    
    // Validate base64 size
    const optimizedSize = base64Image.length;
    if (optimizedSize > MAX_BASE64_SIZE) {
      const error = new Error(
        `Image too large after optimization: ${Math.round(optimizedSize / 1024)}KB (max ${Math.round(MAX_BASE64_SIZE / 1024)}KB). Please use a smaller image.`
      ) as PasteImageError & { type: 'too-large' };
      error.type = 'too-large';
      throw error;
    }

    return {
      base64Image,
      originalSize,
      optimizedSize
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      // Re-throw our custom errors
      throw error;
    }
    
    // Handle optimization errors
    const processingError = new Error(
      error instanceof Error ? error.message : 'Failed to process image'
    ) as PasteImageError & { type: 'processing-error' };
    processingError.type = 'processing-error';
    throw processingError;
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
  const inputTypes = ['input', 'textarea', 'select'];
  
  if (inputTypes.includes(tagName)) {
    return true;
  }

  // Check for contenteditable elements
  if (activeElement.getAttribute('contenteditable') === 'true') {
    return true;
  }

  // Check for elements with role="textbox"
  if (activeElement.getAttribute('role') === 'textbox') {
    return true;
  }

  return false;
}

/**
 * Checks if the browser supports the Clipboard API
 */
export function isClipboardAPISupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'clipboard' in navigator &&
    typeof navigator.clipboard.read === 'function'
  );
}

/**
 * Alternative method to read clipboard using the modern Clipboard API
 * Falls back to paste event handling if not supported
 */
export async function readClipboardImage(): Promise<PasteImageResult> {
  if (!isClipboardAPISupported()) {
    throw new Error('Clipboard API not supported in this browser');
  }

  try {
    const clipboardItems = await navigator.clipboard.read();
    
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          const blob = await clipboardItem.getType(type);
          const file = new File([blob], 'pasted-image', { type });
          
          const originalSize = file.size;
          const base64Image = await optimizeFileToBase64(file, 640, 0.5);
          const optimizedSize = base64Image.length;
          
          if (optimizedSize > MAX_BASE64_SIZE) {
            const error = new Error(
              `Image too large after optimization: ${Math.round(optimizedSize / 1024)}KB (max ${Math.round(MAX_BASE64_SIZE / 1024)}KB)`
            ) as PasteImageError & { type: 'too-large' };
            error.type = 'too-large';
            throw error;
          }
          
          return {
            base64Image,
            originalSize,
            optimizedSize
          };
        }
      }
    }
    
    const error = new Error('No image found in clipboard') as PasteImageError & { type: 'no-image' };
    error.type = 'no-image';
    throw error;
  } catch (error) {
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }
    
    const processingError = new Error(
      error instanceof Error ? error.message : 'Failed to read clipboard'
    ) as PasteImageError & { type: 'processing-error' };
    processingError.type = 'processing-error';
    throw processingError;
  }
}
