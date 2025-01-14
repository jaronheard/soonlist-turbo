import { useCallback, useEffect } from "react";
import { Linking } from "react-native";

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
      console.log("[useIntentHandler] Handling intent with URL:", url);
      console.log("[useIntentHandler] Current scheme:", scheme);

      if (url.startsWith(`${scheme}://`) && !url.startsWith(`${scheme}:///`)) {
        console.log("[useIntentHandler] Fixing URL format");
        url = url.replace(`${scheme}://`, `${scheme}:///`);
      }

      console.log("[useIntentHandler] Processing URL:", url);
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;
      const intentType = params.get("intent");

      console.log("[useIntentHandler] Intent type:", intentType);

      if (!intentType) {
        console.log("[useIntentHandler] No intent type found, returning null");
        return null;
      }

      switch (intentType) {
        case "new": {
          console.log("[useIntentHandler] Processing 'new' intent");
          const text = params.get("text");
          const imageUri = params.get("imageUri");

          console.log("[useIntentHandler] Text param:", text);
          console.log("[useIntentHandler] ImageUri param:", imageUri);

          if (text) {
            const decodedText = decodeURIComponent(text);
            console.log(
              "[useIntentHandler] Setting text intent params:",
              decodedText,
            );
            setIntentParams({ text: decodedText });
            return { type: "new", text: decodedText };
          } else if (imageUri && VALID_IMAGE_REGEX.test(imageUri)) {
            const decodedUri = decodeURIComponent(imageUri);
            console.log(
              "[useIntentHandler] Setting image intent params:",
              decodedUri,
            );
            setIntentParams({ imageUri: decodedUri });
            return { type: "new", imageUri: decodedUri };
          }
          console.log("[useIntentHandler] No valid text or image params found");
          break;
        }
        default: {
          console.warn(`[useIntentHandler] Unknown intent type: ${intentType}`);
        }
      }

      console.log(
        "[useIntentHandler] Returning null - no matching intent handled",
      );
      return null;
    },
    [setIntentParams],
  );

  useEffect(() => {
    console.log("Setting up URL handling effect");

    const handleInitialURL = async () => {
      console.log("Handling initial URL");
      const initialUrl = await Linking.getInitialURL();
      console.log("Initial URL:", initialUrl);
      if (initialUrl) {
        handleIntent(initialUrl);
      }
    };

    void handleInitialURL();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleIntent(url);
    });

    return () => {
      console.log("Cleaning up URL handling effect");
      subscription.remove();
    };
  }, [handleIntent]);

  return { handleIntent };
}
