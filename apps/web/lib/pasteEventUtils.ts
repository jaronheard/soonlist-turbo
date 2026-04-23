export function shouldHandlePasteEvent(event: ClipboardEvent): boolean {
  let target: Element | null = null;

  if (event.target instanceof Element) {
    target = event.target;
  } else {
    const path = event.composedPath();
    target =
      path.find((item): item is Element => item instanceof Element) || null;
  }

  if (!target) return false;

  if (isEditableElement(target)) return false;

  const closestEditable = target.closest(
    'input, textarea, [contenteditable], [role="textbox"]',
  );
  if (closestEditable) return false;

  return true;
}

export function isEditableElement(element: Element): boolean {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return true;
  }

  if ("isContentEditable" in element && element.isContentEditable) {
    return true;
  }

  if (element.getAttribute("role")?.toLowerCase() === "textbox") {
    return true;
  }

  return false;
}

export function extractFilesFromClipboard(clipboardData: DataTransfer): File[] {
  const files: File[] = [];

  for (const item of clipboardData.items) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  if (files.length === 0) {
    for (const file of clipboardData.files) {
      files.push(file);
    }
  }

  return files;
}

export function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): File[] {
  const files: File[] = [];

  for (const item of dataTransfer.items) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  if (files.length === 0) {
    for (const file of dataTransfer.files) {
      files.push(file);
    }
  }

  return files;
}

export function hasFiles(dataTransfer: DataTransfer): boolean {
  for (const item of dataTransfer.items) {
    if (item.kind === "file") {
      return true;
    }
  }

  return false;
}

export function isTargetPage(pathname: string): boolean {
  if (pathname === "/new") return true;

  if (/^\/[^/]+\/upcoming$/.exec(pathname)) return true;

  if (/^\/event\/[^/]+$/.exec(pathname)) return true;

  return false;
}

export function getPageContext(
  pathname: string,
): "new" | "eventList" | "eventPage" | "other" {
  if (pathname === "/new") return "new";
  if (/^\/[^/]+\/upcoming$/.exec(pathname)) return "eventList";
  if (/^\/event\/[^/]+$/.exec(pathname)) return "eventPage";
  return "other";
}

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

  const mimeType = file.type.toLowerCase();

  if (mimeType && supportedTypes.includes(mimeType)) {
    return true;
  }

  if (file.name) {
    const fileName = file.name.toLowerCase();
    const extension = fileName.split(".").pop();

    if (extension && supportedExtensions.includes(extension)) {
      return true;
    }
  }

  return false;
}

export function getNavigationPath(
  pageContext: ReturnType<typeof getPageContext>,
  currentPath: string,
  username: string,
): string {
  const safeUsername =
    username && username.trim() !== "" ? encodeURIComponent(username) : "me";

  switch (pageContext) {
    case "new":
      return `/${safeUsername}/upcoming`;
    case "eventList":
      return currentPath;
    case "eventPage":
      return `/${safeUsername}/upcoming`;
    default:
      return `/${safeUsername}/upcoming`;
  }
}
