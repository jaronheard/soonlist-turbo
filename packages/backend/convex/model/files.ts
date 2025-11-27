/**
 * Upload base64 image to CDN
 */
export async function uploadImageToCDNFromBase64(
  base64Image: string,
  contentType?: string,
): Promise<string | null> {
  try {
    if (!base64Image || typeof base64Image !== "string") {
      console.error("Invalid base64 string format");
      return null;
    }

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // Convert base64 string to Uint8Array (Convex doesn't have Buffer)
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const imageBuffer = bytes;

    const response = await fetch(
      "https://api.bytescale.com/v2/accounts/12a1yek/uploads/binary",
      {
        method: "POST",
        headers: {
          "Content-Type": contentType?.startsWith("image/")
            ? contentType
            : "image/webp",
          Authorization: "Bearer public_12a1yekATNiLj4VVnREZ8c7LM8V8",
        },
        body: imageBuffer,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Upload failed with status ${response.status}: ${errorBody}`,
      );
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const parsedResponse = (await response.json()) as { fileUrl: string };
    return parsedResponse.fileUrl;
  } catch (error) {
    console.error("Error uploading image to CDN:", error);
    return null;
  }
}

function extractFilePathFromBytescaleUrl(url: string): string | null {
  if (!url) return null;

  const match = /\/uploads\/\d{4}\/\d{2}\/\d{2}\/[^?]+/.exec(url);
  if (match) {
    return match[0];
  }

  const altMatch = /\/image\/(.+?)(?:\?|$)/.exec(url);
  if (altMatch) {
    return `/${altMatch[1]}`;
  }

  return null;
}

export function buildBrandedImageUrl(
  originalImageUrl: string | null | undefined,
): string {
  if (!originalImageUrl) {
    return "";
  }

  const filePath = extractFilePathFromBytescaleUrl(originalImageUrl);
  if (!filePath) {
    console.warn(
      "Could not extract file path from Bytescale URL:",
      originalImageUrl,
    );
    return originalImageUrl;
  }

  const accountId = "12a1yek";
  const baseUrl = `https://upcdn.io/${accountId}/image${filePath}`;
  const params = new URLSearchParams();

  params.set("w", "500");
  params.set("h", "500");
  params.set("crop", "smart");

  params.set("image", "/uploads/Soonlist/soonlist-logo.png");
  params.set("layer-w", "80");
  params.set("gravity", "bottom-left");
  params.set("padding", "12");

  params.append("image", "/uploads/Soonlist/soonlist-link.png");
  params.append("layer-w", "160");
  params.append("gravity", "bottom-right");
  params.append("padding", "12");

  return `${baseUrl}?${params.toString()}`;
}
