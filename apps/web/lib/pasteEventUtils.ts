/**
 * Utility functions for handling paste events intelligently
 */

/**
 * Checks if a paste event should be handled by the image paste handler
 */
export function shouldHandlePasteEvent(event: ClipboardEvent): boolean {
  const target = event.target as Element;
  if (!target) return false;
  
  // Don't handle if target is an editable element
  if (isEditableElement(target)) return false;
  
  // Don't handle if target is inside an editable element
  const closestEditable = target.closest('input, textarea, [contenteditable="true"]');
  if (closestEditable) return false;
  
  return true;
}

/**
 * Checks if an element is editable (input, textarea, contenteditable)
 */
export function isEditableElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  
  // Check for input and textarea elements
  if (tagName === 'input' || tagName === 'textarea') return true;
  
  // Check for contenteditable elements
  if (element.getAttribute('contenteditable') === 'true') return true;
  
  // Check for elements with role="textbox"
  if (element.getAttribute('role') === 'textbox') return true;
  
  return false;
}

/**
 * Extracts image files from clipboard data
 */
export function extractImagesFromClipboard(clipboardData: DataTransfer): File[] {
  const images: File[] = [];
  
  for (let i = 0; i < clipboardData.items.length; i++) {
    const item = clipboardData.items[i];
    if (item && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        images.push(file);
      }
    }
  }
  
  return images;
}

/**
 * Checks if the current pathname is a target page for image paste handling
 */
export function isTargetPage(pathname: string): boolean {
  // /new page
  if (pathname === '/new') return true;
  
  // Event list pages: /[userName]/upcoming
  if (pathname.match(/^\/[^/]+\/upcoming$/)) return true;
  
  // Individual event pages: /event/[eventId]
  if (pathname.match(/^\/event\/[^/]+$/)) return true;
  
  return false;
}

/**
 * Determines the page context based on pathname
 */
export function getPageContext(pathname: string): 'new' | 'eventList' | 'eventPage' | 'other' {
  if (pathname === '/new') return 'new';
  if (pathname.match(/^\/[^/]+\/upcoming$/)) return 'eventList';
  if (pathname.match(/^\/event\/[^/]+$/)) return 'eventPage';
  return 'other';
}

/**
 * Validates that a file is a supported image type
 */
export function isValidImageFile(file: File): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml'
  ];
  
  return supportedTypes.includes(file.type.toLowerCase());
}

/**
 * Gets the appropriate navigation path after image processing based on page context
 */
export function getNavigationPath(
  pageContext: ReturnType<typeof getPageContext>,
  currentPath: string,
  username: string
): string {
  switch (pageContext) {
    case 'new':
      // Stay on new page or go to upcoming - for now go to upcoming
      return `/${username}/upcoming`;
    case 'eventList':
      // Stay on the current event list page
      return currentPath;
    case 'eventPage':
      // Go to user's upcoming page
      return `/${username}/upcoming`;
    default:
      // Default to upcoming page
      return `/${username}/upcoming`;
  }
}
