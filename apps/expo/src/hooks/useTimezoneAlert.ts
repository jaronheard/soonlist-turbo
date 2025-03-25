import type { AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";

import { useAppStore, useUserTimezone } from "~/store";
import { getUserTimeZone } from "~/utils/dates";

export function useTimezoneAlert() {
  const userTimezone = useUserTimezone();
  const { setUserTimezone, hasShownTimezoneAlert, setHasShownTimezoneAlert } =
    useAppStore();
  const prevUserTimezoneRef = useRef(userTimezone);

  // Reset alert state when user timezone changes
  useEffect(() => {
    if (prevUserTimezoneRef.current !== userTimezone) {
      setHasShownTimezoneAlert(false);
      prevUserTimezoneRef.current = userTimezone;
    }
  }, [userTimezone, setHasShownTimezoneAlert]);

  useEffect(() => {
    const checkTimezone = () => {
      const systemTimezone = getUserTimeZone();

      if (
        userTimezone &&
        systemTimezone !== userTimezone &&
        !hasShownTimezoneAlert
      ) {
        Alert.alert(
          "Timezone Mismatch",
          `Your device timezone (${systemTimezone}) is different from your selected timezone (${userTimezone}). Would you like to update to your device timezone?`,
          [
            {
              text: "Keep Current",
              style: "cancel",
              onPress: () => setHasShownTimezoneAlert(true),
            },
            {
              text: "Update",
              onPress: () => {
                setUserTimezone(systemTimezone);
                setHasShownTimezoneAlert(true);
              },
            },
          ],
        );
      }
    };

    // Check on mount and when app comes to foreground
    checkTimezone();

    // Re-check timezone when app becomes active
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkTimezone();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [
    userTimezone,
    setUserTimezone,
    hasShownTimezoneAlert,
    setHasShownTimezoneAlert,
  ]);
}
