import { useEffect } from "react";
import { Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { toast } from "sonner-native";

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

  // No need to render anything as we're immediately redirecting
  return null;
}
