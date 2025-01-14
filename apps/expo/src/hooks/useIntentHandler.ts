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
    // 1. Fix scheme if necessary
    // e.g. soonlist.dev:// => soonlist.dev:/// (just like Bluesky does)
    if (
      url.startsWith("soonlist.dev://") &&
      !url.startsWith("soonlist.dev:///")
    ) {
      url = url.replace("soonlist.dev://", "soonlist.dev:///");
    }

    // 2. Parse the URL
    const parsedUrl = new URL(url);
    // e.g. if it's soonlist.dev:///new?text=hello => route is "new"
    const route = parsedUrl.pathname.replace(/^\/+/, "");
    const params = parsedUrl.searchParams;

    // 3. Switch on the route
    switch (route) {
      case "new": {
        const textParam = params.get("text");
        const imageUriParam = params.get("imageUri");

        // If there's text
        if (textParam) {
          const decoded = decodeURIComponent(textParam);
          // Save in store so we can grab it if we want
          setIntentParams({ text: decoded });

          // Optionally push the route with the param.
          // This ensures `useLocalSearchParams()` sees "text=hello"
          router.push(`/new?text=${encodeURIComponent(decoded)}`);
          return;
        }

        // If there's an image
        if (imageUriParam) {
          const decoded = decodeURIComponent(imageUriParam);
          setIntentParams({ imageUri: decoded });
          router.push(`/new?imageUri=${encodeURIComponent(decoded)}`);
          return;
        }

        // If no text or image, still navigate to /new
        router.push("/new");
        return;
      }

      default:
        // You could handle other routes here if needed
        break;
    }
  }
}
