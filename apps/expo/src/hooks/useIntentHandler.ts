// apps/expo/src/hooks/useIntentHandler.ts
import { useCallback, useEffect } from "react";
import Constants from "expo-constants";
import { useURL } from "expo-linking";
import { useRouter, useRootNavigationState } from "expo-router";

import { useAppStore } from "~/store";
import { logDebug, logError, logMessage } from "~/utils/errorLogging";

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
  const rootNavigationState = useRootNavigationState();
  const { setIntentParams } = useAppStore();

  const handleDeepLink = useCallback(
    (url: string) => {
      try {
        logMessage("Handling deep link", { url }, { type: "info" });

        // 1. Check for valid scheme
        if (!url.startsWith(`${APP_SCHEME}://`)) {
          logError("Invalid scheme", new Error(`Invalid scheme: ${url}`), {
            url,
          });
          return;
        }

        // 2. Parse the URL
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch (error) {
          logError("Invalid URL", error, { url });
          return;
        }

        const route = parsedUrl.pathname.replace(/^\/+/, "");
        const params = parsedUrl.searchParams;

        logDebug("Route", {
          route,
          params: Object.fromEntries(params.entries()),
        });

        // 3. Switch on the route
        switch (route) {
          case "new": {
            const textParam = params.get("text");
            const imageUriParam = params.get("imageUri");
            logDebug("New route params", { textParam, imageUriParam });

            if (textParam) {
              try {
                const decoded = decodeURIComponent(textParam);
                setIntentParams({ text: decoded });
                logDebug("Pushing to new with text", { decoded });
                router.push(`/new?text=${encodeURIComponent(decoded)}`);
                return;
              } catch (error) {
                logError("Failed to decode text param", error, { textParam });
                return;
              }
            }

            if (imageUriParam) {
              try {
                const decoded = decodeURIComponent(imageUriParam);
                // Validate image URI format
                if (!VALID_IMAGE_REGEX.test(decoded)) {
                  logError(
                    "Invalid image URI format",
                    new Error("Image URI doesn't match expected format"),
                    { imageUri: decoded },
                  );
                  return;
                }
                setIntentParams({ imageUri: decoded });
                logDebug("Pushing to new with imageUri", { decoded });
                router.push(`/new?imageUri=${encodeURIComponent(decoded)}`);
                return;
              } catch (error) {
                logError("Failed to decode imageUri param", error, {
                  imageUriParam,
                });
                return;
              }
            }
            logDebug("Pushing to new", undefined);
            router.push("/new");
            return;
          }

          default:
            logMessage("Unhandled route", { route }, { type: "warning" });
            break;
        }
      } catch (error) {
        logError("Failed to handle deep link", error, { url });
      }
    },
    [router, setIntentParams],
  );

  useEffect(() => {
    const isNavigationReady = rootNavigationState?.key !== null;

    if (!isNavigationReady) {
      return;
    }

    logDebug("Incoming URL", incomingUrl);
    if (!incomingUrl || incomingUrl === prevUrl) return;
    logDebug("Setting incoming URL", incomingUrl);
    prevUrl = incomingUrl;
    handleDeepLink(incomingUrl);
  }, [incomingUrl, handleDeepLink, rootNavigationState?.key]);
}
