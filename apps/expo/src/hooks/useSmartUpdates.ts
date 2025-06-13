import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useGlobalSearchParams, usePathname } from "expo-router";
import * as Updates from "expo-updates";

const CRITICAL_PATHS = ["/event/new", "/event/[id]/edit", "/new"];

type UpdateStatus = {
  available: boolean;
  downloading: boolean;
  ready: boolean;
};

export function useSmartUpdates() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    available: false,
    downloading: false,
    ready: false,
  });

  const lastCheckRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const isCriticalPath = useCallback((): boolean => {
    return CRITICAL_PATHS.some((path) => {
      if (path.includes("[id]")) {
        const regex = new RegExp(path.replace("[id]", "\\w+"));
        return regex.test(pathname);
      }
      return pathname.startsWith(path);
    });
  }, [pathname]);

  const applyUpdate = useCallback(async () => {
    if (!updateStatus.ready) return;

    const stateToSave = {
      path: pathname,
      params: Object.keys(params).length > 0 ? params : null,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem("@pending_navigation", JSON.stringify(stateToSave));
    await Updates.reloadAsync();
  }, [pathname, params, updateStatus.ready]);

  const checkForUpdate = useCallback(async () => {
    if (Date.now() - lastCheckRef.current < 60_000) return; // minimum 1 minute

    try {
      lastCheckRef.current = Date.now();

      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) return;

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateStatus((prev) => ({ ...prev, available: true, downloading: true }));

        await Updates.fetchUpdateAsync();

        setUpdateStatus((prev) => ({ ...prev, downloading: false, ready: true }));

        if (!isCriticalPath()) {
          setTimeout(() => {
            void applyUpdate();
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Update check failed:", error);
      setUpdateStatus((prev) => ({ ...prev, downloading: false }));
    }
  }, [applyUpdate, isCriticalPath]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (/inactive|background/.exec(appStateRef.current) && nextAppState === "active") {
        void checkForUpdate();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    void checkForUpdate();

    return () => subscription.remove();
  }, [checkForUpdate]);

  useEffect(() => {
    if (updateStatus.ready && isCriticalPath()) {
      Alert.alert(
        "Update Ready",
        "A new version is available. It will be applied when you leave this screen.",
        [{ text: "OK" }],
      );
    }
  }, [updateStatus.ready, isCriticalPath]);

  useEffect(() => {
    if (updateStatus.ready && !isCriticalPath()) {
      void applyUpdate();
    }
  }, [pathname, updateStatus.ready, isCriticalPath, applyUpdate]);

  return {
    ...updateStatus,
    checkNow: checkForUpdate,
    applyNow: applyUpdate,
    isCriticalPath: isCriticalPath(),
  };
}
