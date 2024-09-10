import type { BottomSheetModal } from "@discord/bottom-sheet";
import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { useRouter } from "expo-router";

interface IntentHandlerProps {
  bottomSheetModalRef: React.RefObject<BottomSheetModal>;
  setInput: (input: string) => void;
  setImagePreview: (imagePreview: string | null) => void;
}

export function useIntentHandler({
  bottomSheetModalRef,
  setInput,
  setImagePreview,
}: IntentHandlerProps) {
  const hasHandledInitialURL = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const handleIntent = async (url: string) => {
      const parsedUrl = new URL(url);

      // Only handle URLs that start with "/intent"
      if (!parsedUrl.pathname.startsWith("/intent")) {
        return;
      }

      // Currently, we only handle "/intent/new"
      if (parsedUrl.pathname === "/intent/new") {
        const text = parsedUrl.searchParams.get("text");
        const imageUri = parsedUrl.searchParams.get("imageUri");

        // Redirect to /feed
        router.replace("/feed");

        if (text) {
          setInput(decodeURIComponent(text));
          setImagePreview(null);
        } else if (imageUri) {
          const [uri, width, height] = decodeURIComponent(imageUri).split("|");
          setImagePreview(uri ?? null);
          setInput(`Image: ${width}x${height}`);
        }

        // Short delay to ensure navigation is complete before opening the modal
        setTimeout(() => {
          bottomSheetModalRef.current?.present();
        }, 100);
      }
    };

    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && !hasHandledInitialURL.current) {
        hasHandledInitialURL.current = true;
        await handleIntent(initialUrl);
      }
    };

    void handleInitialURL();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleIntent(url);
    });

    return () => {
      subscription.remove();
    };
  }, [bottomSheetModalRef, setInput, setImagePreview, router]);
}
