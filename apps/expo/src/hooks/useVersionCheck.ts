import { useEffect, useState } from "react";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { logDebug, logError } from "~/utils/errorLogging";
import { isVersionBehind } from "~/utils/versionCompare";

const IS_TESTFLIGHT = Application.applicationId?.endsWith(".beta");
const IS_DEV =
  __DEV__ || Constants.expoConfig?.scheme === "soonlist.dev" || IS_TESTFLIGHT;

export function useVersionCheck() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const minimumRequiredVersion = useQuery(
    api.appConfig.getMinimumRequiredVersion,
  );

  useEffect(() => {
    // Bypass version check for development and test builds
    if (IS_DEV) {
      logDebug("Version check bypassed - development/test build");
      return;
    }

    // Don't check if minimum version hasn't been fetched yet
    if (minimumRequiredVersion === undefined) {
      return;
    }

    // If no minimum version is set, allow app to continue
    if (minimumRequiredVersion === null) {
      logDebug("No minimum required version set - allowing app to continue");
      return;
    }

    const currentVersion = Application.nativeApplicationVersion;

    if (!currentVersion) {
      logError("Could not determine current app version", new Error());
      return;
    }

    try {
      const behind = isVersionBehind(currentVersion, minimumRequiredVersion);

      if (behind) {
        logDebug("App version is behind minimum required version", {
          currentVersion,
          minimumRequiredVersion,
        });
        setShowUpdateModal(true);
      } else {
        logDebug("App version is up to date", {
          currentVersion,
          minimumRequiredVersion,
        });
      }
    } catch (error) {
      logError("Error comparing versions", error, {
        currentVersion,
        minimumRequiredVersion,
      });
      // On error, allow app to continue (graceful offline handling)
    }
  }, [minimumRequiredVersion]);

  return showUpdateModal;
}
