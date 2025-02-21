import { useEffect } from "react";
import { Linking } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { toast } from "sonner-native";
import * as SplashScreen from "expo-splash-screen";

// Prevent splash screen from auto-hiding
void SplashScreen.preventAutoHideAsync();

export default function RedirectScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();

  useEffect(() => {
    async function handleRedirect() {
      if (!url) {
        toast.error("No URL provided");
        return;
      }

      try {
        const canOpen = await Linking.canOpenURL(url);

        if (canOpen) {
          await Linking.openURL(url);
          // Hide splash screen after redirect
          await SplashScreen.hideAsync();
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
  }, [url]);

  return (
    <Stack.Screen 
      options={{
        headerShown: false,
      }}
    />
  );
}
