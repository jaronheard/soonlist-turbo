import { useEffect } from "react";
import { Linking } from "react-native";
import * as SecureStore from "expo-secure-store";

import { getKeyChainAccessGroup } from "~/utils/getKeyChainAccessGroup";

type IntentType = "new";
const scheme =
  process.env.EXPO_PUBLIC_APP_ENV === "development"
    ? "soonlist.dev"
    : "soonlist";

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/;

export function useIntentHandler() {
  useEffect(() => {
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
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
  }, []);
}

async function handleIntent(url: string) {
  // Ensure the third slash for consistency
  if (url.startsWith(`${scheme}://`) && !url.startsWith(`${scheme}:///`)) {
    url = url.replace(`${scheme}://`, `${scheme}:///`);
  }

  const parsedUrl = new URL(url);
  const [_, intent, intentType] = parsedUrl.pathname.split("/");

  if (intent !== "intent") return;

  const params = parsedUrl.searchParams;

  switch (intentType as IntentType) {
    case "new": {
      const text = params.get("text");
      const imageUri = params.get("imageUri");

      await SecureStore.setItemAsync("intentType", "new", {
        keychainAccessGroup: getKeyChainAccessGroup(),
      });

      if (text) {
        await SecureStore.setItemAsync("intentText", decodeURIComponent(text), {
          keychainAccessGroup: getKeyChainAccessGroup(),
        });
      } else if (imageUri) {
        if (VALID_IMAGE_REGEX.test(imageUri)) {
          await SecureStore.setItemAsync(
            "intentImageUri",
            decodeURIComponent(imageUri),
            {
              keychainAccessGroup: getKeyChainAccessGroup(),
            },
          );
        }
      }
      break;
    }
    default: {
      // Handle unknown intent types
      console.warn(`Unknown intent type: ${intentType}`);
    }
  }
}
