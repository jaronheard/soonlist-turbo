import { useCallback, useState } from "react";

type IntentType = "new";
const scheme =
  process.env.EXPO_PUBLIC_APP_ENV === "development"
    ? "soonlist.dev"
    : "soonlist";

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

type Intent = {
  type: IntentType;
  text?: string;
  imageUri?: string;
} | null;

export function useIntentHandler() {
  const [currentIntent, setCurrentIntent] = useState<Intent>(null);

  const handleIntent = useCallback((url: string): Intent => {
    if (url.startsWith(`${scheme}://`) && !url.startsWith(`${scheme}:///`)) {
      url = url.replace(`${scheme}://`, `${scheme}:///`);
    }

    const parsedUrl = new URL(url);
    const params = parsedUrl.searchParams;
    const intentType = params.get("intent") as IntentType | null;

    if (!intentType) return null;

    let result: Intent = null;

    switch (intentType) {
      case "new": {
        const text = params.get("text");
        const imageUri = params.get("imageUri");

        if (text) {
          result = { type: "new", text: decodeURIComponent(text) };
        } else if (imageUri && VALID_IMAGE_REGEX.test(imageUri)) {
          result = { type: "new", imageUri: decodeURIComponent(imageUri) };
        }
        break;
      }
      default: {
        console.warn(`Unknown intent type: ${intentType as string}`);
      }
    }

    setCurrentIntent(result);
    return result;
  }, []);

  const clearIntent = useCallback(() => {
    setCurrentIntent(null);
  }, []);

  return { handleIntent, clearIntent, currentIntent };
}
