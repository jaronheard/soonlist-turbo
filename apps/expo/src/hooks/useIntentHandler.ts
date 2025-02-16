// apps/expo/src/hooks/useIntentHandler.ts
import { useCallback, useEffect } from "react";
import Constants from "expo-constants";
import { useURL } from "expo-linking";
import { useRouter } from "expo-router";

import { useAppStore } from "~/store";

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

function getAppScheme() {
  const configScheme = Constants.expoConfig?.scheme;
  if (configScheme === undefined) {
    throw new Error(
      "App scheme not configured. Please check your app.config.ts",
    );
  }

  if (Array.isArray(configScheme)) {
    throw new Error(
      "Multiple schemes are not supported. Please specify a single scheme in app.config.ts",
    );
  }

  if (!configScheme) {
    throw new Error("No valid scheme found in app config");
  }

  return configScheme;
}

// This will throw if there's no valid scheme, which is what we want
const APP_SCHEME = getAppScheme();

let prevUrl = "";

export function useIntentHandler() {
  // The deep link that triggered the app's opening
  const incomingUrl = useURL();
  const router = useRouter();
  const { setIntentParams } = useAppStore();

  const handleDeepLink = useCallback(
    (url: string) => {
      try {
        console.log("[UseIntentHandler] Handling deep link:", url);
        // 1. Fix scheme if necessary
        if (
          url.startsWith(`${APP_SCHEME}://`) &&
          !url.startsWith(`${APP_SCHEME}:///`)
        ) {
          url = url.replace(`${APP_SCHEME}://`, `${APP_SCHEME}:///`);
        }

        // 2. Parse the URL
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch (error) {
          console.error("[useIntentHandler] Invalid URL:", url, error);
          return;
        }

        const route = parsedUrl.pathname.replace(/^\/+/, "");
        const params = parsedUrl.searchParams;

        console.log("[UseIntentHandler] Route:", route);
        console.log("[UseIntentHandler] Params:", params);

        // 3. Switch on the route
        switch (route) {
          case "new": {
            const textParam = params.get("text");
            const imageUriParam = params.get("imageUri");
            console.log("[UseIntentHandler] Text param:", textParam);
            console.log("[UseIntentHandler] Image URI param:", imageUriParam);

            if (textParam) {
              try {
                const decoded = decodeURIComponent(textParam);
                setIntentParams({ text: decoded });
                console.log(
                  "[UseIntentHandler] Pushing to new with text:",
                  decoded,
                );
                router.push(`/new?text=${encodeURIComponent(decoded)}`);
                return;
              } catch (error) {
                console.error(
                  "[useIntentHandler] Failed to decode text param:",
                  error,
                );
                return;
              }
            }

            if (imageUriParam) {
              try {
                const decoded = decodeURIComponent(imageUriParam);
                // Validate image URI format
                if (!VALID_IMAGE_REGEX.test(decoded)) {
                  console.error(
                    "[useIntentHandler] Invalid image URI format:",
                    decoded,
                  );
                  return;
                }
                setIntentParams({ imageUri: decoded });
                console.log(
                  "[UseIntentHandler] Pushing to new with imageUri:",
                  decoded,
                );
                router.push(`/new?imageUri=${encodeURIComponent(decoded)}`);
                return;
              } catch (error) {
                console.error(
                  "[useIntentHandler] Failed to decode imageUri param:",
                  error,
                );
                return;
              }
            }
            console.log("[UseIntentHandler] Pushing to new");
            router.push("/new");
            return;
          }

          default:
            console.warn("[useIntentHandler] Unhandled route:", route);
            break;
        }
      } catch (error) {
        console.error("[useIntentHandler] Failed to handle deep link:", error);
      }
    },
    [router, setIntentParams],
  );

  useEffect(() => {
    console.log("[UseIntentHandler] Incoming URL:", incomingUrl);
    if (!incomingUrl || incomingUrl === prevUrl) return;
    console.log("[UseIntentHandler] Setting incoming URL:", incomingUrl);
    prevUrl = incomingUrl;
    handleDeepLink(incomingUrl);
  }, [incomingUrl, handleDeepLink]);
}
