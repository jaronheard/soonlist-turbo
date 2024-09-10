import { useEffect } from "react";
import { Linking } from "react-native";
import * as SecureStore from "expo-secure-store";

import { getKeyChainAccessGroup } from "~/utils/getKeyChainAccessGroup";

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
  const parsedUrl = new URL(url);

  if (parsedUrl.pathname === "/intent/new") {
    const text = parsedUrl.searchParams.get("text");
    const imageUri = parsedUrl.searchParams.get("imageUri");

    await SecureStore.setItemAsync("intentType", "new", {
      keychainAccessGroup: getKeyChainAccessGroup(),
    });
    if (text) {
      await SecureStore.setItemAsync("intentText", decodeURIComponent(text), {
        keychainAccessGroup: getKeyChainAccessGroup(),
      });
    } else if (imageUri) {
      await SecureStore.setItemAsync(
        "intentImageUri",
        decodeURIComponent(imageUri),
        {
          keychainAccessGroup: getKeyChainAccessGroup(),
        },
      );
    }
  }
}
