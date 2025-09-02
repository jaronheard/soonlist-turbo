import { useEffect, useRef, useState } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";
import { useConvexAuth } from "convex/react";

/**
 * Hook to occasionally prompt users for feedback when they leave the app
 * This helps catch users who might be about to delete the app
 */
export function useFeedbackPrompt() {
  const { isAuthenticated } = useConvexAuth();
  const appState = useRef(AppState.currentState);
  const [lastPromptDate, setLastPromptDate] = useState<Date | null>(null);
  const [promptCount, setPromptCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        // Only show prompt when app is going to background
        if (
          appState.current === "active" &&
          (nextAppState === "background" || nextAppState === "inactive")
        ) {
          // Only show the prompt occasionally (max once per week, max 3 times total)
          const now = new Date();
          const shouldPrompt =
            promptCount < 3 &&
            (!lastPromptDate ||
              now.getTime() - lastPromptDate.getTime() > 7 * 24 * 60 * 60 * 1000);

          // Randomly show the prompt (20% chance) to avoid annoying users
          const randomChance = Math.random() < 0.2;

          if (shouldPrompt && randomChance) {
            // Use setTimeout to ensure the prompt shows after the app has gone to background
            // and the user returns to it later
            setTimeout(() => {
              Alert.alert(
                "Enjoying Soonlist?",
                "We'd love to hear your feedback to make Soonlist even better!",
                [
                  {
                    text: "Not Now",
                    style: "cancel",
                  },
                  {
                    text: "Submit Feedback",
                    onPress: () => {
                      void Linking.openURL(
                        "mailto:feedback@soonlist.com?subject=App%20Feedback"
                      );
                      setLastPromptDate(new Date());
                      setPromptCount((prev) => prev + 1);
                    },
                  },
                ]
              );
            }, 1000);
          }
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, lastPromptDate, promptCount]);
}

