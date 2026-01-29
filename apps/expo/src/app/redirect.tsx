import { useCallback } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";

export default function RedirectScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      async function handleRedirect() {
        try {
          const canOpen = await Linking.canOpenURL(url);

          if (canOpen) {
            await Linking.openURL(url);
          } else {
            toast.error("Cannot redirect to URL", "The URL is not valid");
          }
        } catch (error) {
          logError("Error redirecting to URL", error);
          toast.error("Error redirecting to URL", "Please try again later");
        }

        // Always navigate back or to home, regardless of success or error
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/");
        }
      }

      void handleRedirect();
    }, [url, router]),
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#5A32FB" />
      </View>
    </>
  );
}
