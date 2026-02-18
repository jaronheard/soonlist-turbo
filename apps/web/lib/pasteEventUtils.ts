/**
 * Utility functions for handling paste events intelligently
 */

/**
 * Checks if a paste event should be handled by the image paste handler
 */
export function shouldHandlePasteEvent(event: ClipboardEvent): boolean {
  // First ensure we have an Element
  let target: Element | null = null;

  if (event.target instanceof Element) {
    target = event.target;
  } else {
    // Use composedPath to find the first Element in the event path
    const path = event.composedPath();
    target =
      path.find((item): item is Element => item instanceof Element) || null;
  }

  if (!target) return false;

  // Don't handle if target is an editable element
  if (isEditableElement(target)) return false;

  // Don't handle if target is inside an editable element
  // Use broader selector to catch any contenteditable value and ARIA textboxes
  const closestEditable = target.closest(
    'input, textarea, [contenteditable], [role="textbox"]',
  );
  if (closestEditable) return false;

  return true;
}

/**
 * Checks if an element is editable (input, textarea, contenteditable)
 */
export function isEditableElement(element: Element): boolean {
  // Check for input and textarea elements using instance checks
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return true;
  }

  // Check for contenteditable elements using the DOM API
  if ("isContentEditable" in element && element.isContentEditable) {
    return true;
  }

  // Check for elements with role="textbox" (normalize case)
  if (element.getAttribute("role")?.toLowerCase() === "textbox") {
    return true;
  }

  return false;
}

/**
 * Extracts files from clipboard data
 * Returns all files so handlers can validate and show appropriate errors
 */
export function extractFilesFromClipboard(clipboardData: DataTransfer): File[] {
  const files: File[] = [];

  // First try clipboardData.items (works in most browsers)
  for (const item of clipboardData.items) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  // Fallback to clipboardData.files for Safari compatibility
  // Only use this if items was undefined or empty
  if (files.length === 0) {
    for (const file of clipboardData.files) {
      files.push(file);
    }
  }

  return files;
}

/**
 * Extracts files from drag and drop DataTransfer
 * Returns all files so handlers can validate and show appropriate errors
 */
export function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): File[] {
  const files: File[] = [];

  // Try dataTransfer.items first (preferred method)
  for (const item of dataTransfer.items) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  // Fallback to dataTransfer.files
  if (files.length === 0) {
    for (const file of dataTransfer.files) {
      files.push(file);
    }
  }

  return files;
}

/**
 * Checks if a DataTransfer contains any files
 * Useful for dragover event handling
 */
export function hasFiles(dataTransfer: DataTransfer): boolean {
  // Check items for any files (not just images, so we can show appropriate errors)
  // Note: dataTransfer.types contains general identifiers like "Files" or "text/plain",
  // NOT specific MIME types, so we must check items instead
  for (const item of dataTransfer.items) {
    if (item.kind === "file") {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the current pathname is a target page for image paste handling
 */
export function isTargetPage(pathname: string): boolean {
  // /new and /add pages
  if (pathname === "/new" || pathname === "/add") return true;

  // Event list pages: /[userName]/upcoming
  if (/^\/[^/]+\/upcoming$/.exec(pathname)) return true;

  // Individual event pages: /event/[eventId]
  if (/^\/event\/[^/]+$/.exec(pathname)) return true;

  return false;
}

/**
 * Determines the page context based on pathname
 */
export function getPageContext(
  pathname: string,
): "new" | "eventList" | "eventPage" | "other" {
  if (pathname === "/new" || pathname === "/add") return "new";
  if (/^\/[^/]+\/upcoming$/.exec(pathname)) return "eventList";
  if (/^\/event\/[^/]+$/.exec(pathname)) return "eventPage";
  return "other";
}

/**
 * Validates that a file is a supported image type
 */
export function isValidImageFile(file: File): boolean {
  const supportedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
  ];

  const supportedExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];

  // Normalize MIME type to lowercase
  const mimeType = file.type.toLowerCase();

  // If MIME type is available and valid, use it
  if (mimeType && supportedTypes.includes(mimeType)) {
    return true;
  }

  // Fallback to file extension if MIME type is empty or invalid
  if (file.name) {
    const fileName = file.name.toLowerCase();
    const extension = fileName.split(".").pop();

    if (extension && supportedExtensions.includes(extension)) {
      return true;
    }
  }

  return false;
}

/**
 * Gets the appropriate navigation path after image processing based on page context
 */
export function getNavigationPath(
  pageContext: ReturnType<typeof getPageContext>,
  currentPath: string,
  username: string,
): string {
  // Compute safe username up front to prevent malformed URLs and path injection
  const safeUsername =
    username && username.trim() !== "" ? encodeURIComponent(username) : "me";

  switch (pageContext) {
    case "new":
      // Stay on new page or go to upcoming - for now go to upcoming
      return `/${safeUsername}/upcoming`;
    case "eventList":
      // Stay on the current event list page
      return currentPath;
    case "eventPage":
      // Go to user's upcoming page
      return `/${safeUsername}/upcoming`;
    default:
      // Default to upcoming page
      return `/${safeUsername}/upcoming`;
  }
}
