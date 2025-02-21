import { useCallback } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { toast } from "sonner-native";

export default function RedirectScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      async function handleRedirect() {
        if (!url) {
          toast.error("No URL provided");
          return;
        }

        try {
          const canOpen = await Linking.canOpenURL(url);

          if (canOpen) {
            await Linking.openURL(url);
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          } else {
            toast.error("Cannot open URL", {
              description: "The URL provided is not valid or cannot be opened",
            });
          }
        } catch (error) {
          console.error("Error opening URL:", error);
          toast.error("Error opening URL", {
            description: "Please try again later",
          });
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
