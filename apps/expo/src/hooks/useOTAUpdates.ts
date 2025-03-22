import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState, Platform } from "react-native";
import * as Application from "expo-application";
import * as Updates from "expo-updates";

import { logDebug, logError } from "~/utils/errorLogging";

const MINIMUM_MINIMIZE_TIME = 15 * 60e3;
const IS_TESTFLIGHT = Application.applicationId?.endsWith(".beta");
const isIOS = Platform.OS === "ios";
const nativeBuildVersion = Application.nativeBuildVersion;

async function setExtraParams() {
  await Updates.setExtraParamAsync(
    isIOS ? "ios-build-number" : "android-build-number",
    // Hilariously, `buildVersion` is not actually a string on Android even though the TS type says it is.
    // This just ensures it gets passed as a string
    `${nativeBuildVersion}`,
  );
  await Updates.setExtraParamAsync(
    "channel",
    IS_TESTFLIGHT ? "testflight" : "production",
  );
}

export function useOTAUpdates() {
  const shouldReceiveUpdates = Updates.isEnabled && !__DEV__;
  const appState = useRef(AppState.currentState);
  const lastMinimize = useRef(0);
  const ranInitialCheck = useRef(false);
  const timeout = useRef<NodeJS.Timeout>();
  const { isUpdatePending } = Updates.useUpdates();

  ///////////////////////////////////////////////////////////////////////////

  const setCheckTimeout = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    timeout.current = setTimeout(async () => {
      try {
        await setExtraParams();

        logDebug("Checking for update");
        const res = await Updates.checkForUpdateAsync();

        if (res.isAvailable) {
          logDebug("Attempting to fetch update");
          await Updates.fetchUpdateAsync();
        } else {
          logDebug("No update available");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        logError("OTA Update Error", e, { buildVersion: nativeBuildVersion });
      }
    }, 10e3);
  }, []);

  const onIsTestFlight = useCallback(async () => {
    try {
      await setExtraParams();

      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) {
        await Updates.fetchUpdateAsync();

        Alert.alert(
          "Update Available",
          "A new version of the app is available. Relaunch now?",
          [
            {
              text: "No",
              style: "cancel",
            },
            {
              text: "Relaunch",
              style: "default",
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onPress: async () => {
                await Updates.reloadAsync();
              },
            },
          ],
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      logError("Internal OTA Update Error", e, {
        isTestFlight: IS_TESTFLIGHT,
        buildVersion: nativeBuildVersion,
      });
    }
  }, []);

  useEffect(() => {
    // We use this setTimeout to allow Statsig to initialize before we check for an update
    // For Testflight users, we can prompt the user to update immediately whenever there's an available update. This
    // is suspect however with the Apple App Store guidelines, so we don't want to prompt production users to update
    // immediately.
    if (IS_TESTFLIGHT) {
      void onIsTestFlight();
      return;
    } else if (!shouldReceiveUpdates || ranInitialCheck.current) {
      return;
    }

    setCheckTimeout();
    ranInitialCheck.current = true;
  }, [onIsTestFlight, setCheckTimeout, shouldReceiveUpdates]);

  // After the app has been minimized for 15 minutes, we want to either A. install an update if one has become available
  // or B check for an update again.
  useEffect(() => {
    if (!Updates.isEnabled) return;

    const subscription = AppState.addEventListener(
      "change",
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (nextAppState) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // If it's been 15 minutes since the last "minimize", we should feel comfortable updating the client since
          // chances are that there isn't anything important going on in the current session.
          if (lastMinimize.current <= Date.now() - MINIMUM_MINIMIZE_TIME) {
            if (isUpdatePending) {
              await Updates.reloadAsync();
            } else {
              setCheckTimeout();
            }
          }
        } else {
          lastMinimize.current = Date.now();
        }

        appState.current = nextAppState;
      },
    );

    return () => {
      clearTimeout(timeout.current);
      subscription.remove();
    };
  }, [isUpdatePending, setCheckTimeout]);
}
