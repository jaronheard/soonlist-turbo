import { useCallback } from "react";

import { useAppStore } from "~/store";

const scheme =
  process.env.EXPO_PUBLIC_APP_ENV === "development"
    ? "soonlist.dev"
    : "soonlist";

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

export function useIntentHandler() {
  const { setIntentParams } = useAppStore();

  const handleIntent = useCallback(
    (url: string) => {
      if (url.startsWith(`${scheme}://`) && !url.startsWith(`${scheme}:///`)) {
        url = url.replace(`${scheme}://`, `${scheme}:///`);
      }

      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;
      const intentType = params.get("intent");

      if (!intentType) return null;

      switch (intentType) {
        case "new": {
          const text = params.get("text");
          const imageUri = params.get("imageUri");

          if (text) {
            setIntentParams({ text: decodeURIComponent(text) });
            return { type: "new", text: decodeURIComponent(text) };
          } else if (imageUri && VALID_IMAGE_REGEX.test(imageUri)) {
            setIntentParams({ imageUri: decodeURIComponent(imageUri) });
            return { type: "new", imageUri: decodeURIComponent(imageUri) };
          }
          break;
        }
        default: {
          console.warn(`Unknown intent type: ${intentType}`);
        }
      }

      return null;
    },
    [setIntentParams],
  );

  return { handleIntent };
}
