// apps/expo/src/hooks/useIntentHandler.ts
import { useEffect } from "react";
import { useURL } from "expo-linking";
import { useRouter } from "expo-router";

import { useAppStore } from "~/store";

let prevUrl = "";

export function useIntentHandler() {
  // The deep link that triggered the app’s opening
  const incomingUrl = useURL();
  const router = useRouter();
  const { setIntentParams } = useAppStore();

  useEffect(() => {
    if (!incomingUrl || incomingUrl === prevUrl) return;
    prevUrl = incomingUrl;
    handleDeepLink(incomingUrl);
  }, [incomingUrl]);

  function handleDeepLink(url: string) {
    try {
      // 1. Fix scheme if necessary
      if (
        url.startsWith("soonlist.dev://") &&
        !url.startsWith("soonlist.dev:///")
      ) {
        url = url.replace("soonlist.dev://", "soonlist.dev:///");
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

      // 3. Switch on the route
      switch (route) {
        case "new": {
          const textParam = params.get("text");
          const imageUriParam = params.get("imageUri");

          if (textParam) {
            try {
              const decoded = decodeURIComponent(textParam);
              setIntentParams({ text: decoded });
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
              setIntentParams({ imageUri: decoded });
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
  }
}
