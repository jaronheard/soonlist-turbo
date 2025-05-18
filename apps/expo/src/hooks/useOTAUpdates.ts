import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";
import * as Application from "expo-application";
import * as Updates from "expo-updates";

import { logDebug, logError } from "~/utils/errorLogging";

const MINIMUM_MINIMIZE_TIME = 15 * 60e3; // 15 minutes
const IS_TESTFLIGHT = Application.applicationId?.endsWith(".beta");
const isIOS = Platform.OS === "ios";
const nativeBuildVersion = Application.nativeBuildVersion;

async function setExtraParams() {
  if (!Updates.isEmbeddedLaunch) {
    await Updates.setExtraParamAsync(
      isIOS ? "ios-build-number" : "android-build-number",
      `${nativeBuildVersion}`,
    );
    await Updates.setExtraParamAsync(
      "channel",
      IS_TESTFLIGHT ? "testflight" : "production",
    );
  }
}

export function useOTAUpdates() {
  const shouldReceiveUpdates = Updates.isEnabled && !__DEV__;
  const appState = useRef(AppState.currentState);
  const lastMinimizeTimestamp = useRef(Date.now());
  const { isUpdatePending } = Updates.useUpdates();

  const handleCheckForUpdate = useCallback(async () => {
    if (!shouldReceiveUpdates) return;

    try {
      await setExtraParams();
      logDebug("Checking for OTA update...");
      const updateCheckResult = await Updates.checkForUpdateAsync();

      if (updateCheckResult.isAvailable) {
        logDebug("OTA update available, attempting to fetch...");
        await Updates.fetchUpdateAsync();
        logDebug(
          "OTA update fetched successfully. Will be applied on next reload or prompt.",
        );
      } else {
        logDebug("No OTA update available.");
      }
    } catch (error) {
      logError("OTA Update Error during check/fetch", error, {
        buildVersion: nativeBuildVersion,
        isTestFlight: IS_TESTFLIGHT,
      });
    }
  }, [shouldReceiveUpdates]);

  useEffect(() => {
    // Initial check on app load
    void handleCheckForUpdate();
  }, [handleCheckForUpdate]);

  useEffect(() => {
    if (!shouldReceiveUpdates) return undefined;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      void (async () => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          logDebug("App has come to the foreground.");
          if (
            Date.now() - lastMinimizeTimestamp.current >=
            MINIMUM_MINIMIZE_TIME
          ) {
            logDebug(
              "Sufficient time in background, checking for pending update.",
            );
            if (isUpdatePending) {
              Alert.alert(
                "Update Available",
                "A new version of the app is ready. Restart to apply?",
                [
                  {
                    text: "Later",
                    style: "cancel",
                    onPress: () => logDebug("User chose to update later."),
                  },
                  {
                    text: "Restart",
                    style: "default",
                    onPress: () => {
                      logDebug("User chose to restart and apply update.");
                      void Updates.reloadAsync();
                    },
                  },
                ],
              );
            } else {
              logDebug("No update pending, checking for a new one.");
              await handleCheckForUpdate();
            }
          } else {
            logDebug("Not enough time in background to prompt for update.");
          }
        } else if (nextAppState.match(/inactive|background/)) {
          logDebug("App has gone to the background or become inactive.");
          lastMinimizeTimestamp.current = Date.now();
        }

        appState.current = nextAppState;
      })();
    });

    return () => {
      subscription.remove();
    };
  }, [shouldReceiveUpdates, isUpdatePending, handleCheckForUpdate]);
}
