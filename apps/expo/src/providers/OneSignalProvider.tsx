import type {
  NotificationClickEvent,
  NotificationWillDisplayEvent,
} from "react-native-onesignal";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import {
  LogLevel,
  OneSignal,
  OSNotificationPermission,
} from "react-native-onesignal";
import Constants from "expo-constants";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { logError, logMessage } from "~/utils/errorLogging";

interface OneSignalContextType {
  hasNotificationPermission: boolean;
  isPermissionResolved: boolean;
  registerForPushNotifications: () => Promise<boolean>;
  checkPermissionStatus: () => Promise<boolean>;
}

const OneSignalContext = createContext<OneSignalContextType | undefined>(
  undefined,
);

export const useOneSignal = () => {
  const context = useContext(OneSignalContext);
  if (!context) {
    throw new Error("useOneSignal must be used within a OneSignalProvider");
  }
  return context;
};

interface OneSignalProviderProps {
  children: React.ReactNode;
}

interface NotificationData {
  url?: string;
  [key: string]: unknown;
}

const toJsonSerializable = (
  obj: unknown,
): Record<string, string | number | boolean | null> => {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  try {
    const serialized = JSON.parse(JSON.stringify(obj)) as Record<
      string,
      unknown
    >;
    const result: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(serialized)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        result[key] = value;
      }
      // Skip complex objects to avoid stringification issues
    }

    return result;
  } catch {
    return {};
  }
};

const handleNavigation = (url: string) => {
  try {
    const appScheme = Constants.expoConfig?.scheme;

    if (!appScheme) {
      logError(
        "App scheme not configured",
        new Error("App scheme not configured in app.config.ts"),
      );
      return;
    }

    if (url.startsWith("/")) {
      const deepLink = Array.isArray(appScheme)
        ? `${appScheme[0]}:${url}`
        : `${appScheme}:${url}`;

      void Linking.openURL(deepLink).catch((error) => {
        logError("Failed to open internal URL", error, { deepLink });
      });
    } else if (url.startsWith("http")) {
      void Linking.openURL(url).catch((error) => {
        logError("Failed to open external URL", error, { url });
      });
    } else {
      logMessage("Unrecognized URL format", { url }, { type: "warning" });
    }
  } catch (error) {
    logError("Failed to navigate to URL", error, { url });
  }
};

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { isAuthenticated } = useConvexAuth();
  const { userId } = useAuth();
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const [isPermissionResolved, setIsPermissionResolved] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    const oneSignalAppId = Constants.expoConfig?.extra
      ?.oneSignalAppId as string;

    if (!oneSignalAppId) {
      logError(
        "OneSignal App ID not defined",
        new Error("OneSignal App ID is not defined in app.config.ts"),
      );
      return;
    }

    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    OneSignal.initialize(oneSignalAppId);

    void OneSignal.Notifications.permissionNative()
      .then((permission) => {
        setHasNotificationPermission(
          permission === OSNotificationPermission.Authorized ||
            permission === OSNotificationPermission.Provisional ||
            permission === OSNotificationPermission.Ephemeral,
        );
        setIsPermissionResolved(true);
      })
      .catch((error) => {
        logError("Error checking notification permission", error);
      });

    const setupNotificationListeners = () => {
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        (event: NotificationWillDisplayEvent) => {
          try {
            posthog.capture("notification_received", {
              title: event.notification.title || "",
              body: event.notification.body || "",
              notificationId: event.notification.notificationId || "",
              data: toJsonSerializable(event.notification.additionalData),
            });
          } catch (error) {
            logError("Failed to capture notification event", error, {
              event: "foregroundWillDisplay",
            });
          }

          event.notification.display();
        },
      );

      OneSignal.Notifications.addEventListener(
        "click",
        (event: NotificationClickEvent) => {
          try {
            posthog.capture("notification_opened", {
              title: event.notification.title || "",
              body: event.notification.body || "",
              notificationId: event.notification.notificationId || "",
              data: toJsonSerializable(event.notification.additionalData),
            });
          } catch (error) {
            logError("Failed to capture notification event", error, {
              event: "click",
            });
          }

          const data = event.notification.additionalData as
            | NotificationData
            | undefined;
          if (data?.url && typeof data.url === "string") {
            try {
              posthog.capture("notification_deep_link", {
                title: event.notification.title || "",
                body: event.notification.body || "",
                notificationId: event.notification.notificationId || "",
                data: toJsonSerializable(event.notification.additionalData),
                url: data.url,
              });
            } catch (error) {
              logError("Failed to capture notification event", error, {
                event: "deep_link",
              });
            }

            handleNavigation(data.url);
          }
        },
      );
    };

    setupNotificationListeners();

    return () => {
      OneSignal.Notifications.clearAll();
    };
  }, [posthog]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      OneSignal.login(userId);

      OneSignal.User.addTags({
        userId: userId,
        platform: Platform.OS,
      });
    } else {
      OneSignal.logout();
    }
  }, [userId, isAuthenticated]);

  const checkPermissionStatus = async (): Promise<boolean> => {
    try {
      const permission = await OneSignal.Notifications.permissionNative();
      const isPermissionGranted =
        permission === OSNotificationPermission.Authorized ||
        permission === OSNotificationPermission.Provisional ||
        permission === OSNotificationPermission.Ephemeral;

      setHasNotificationPermission(isPermissionGranted);
      setIsPermissionResolved(true);
      return isPermissionGranted;
    } catch (error) {
      logError("Error checking notification permission", error);
      return false;
    }
  };

  const registerForPushNotifications = async (): Promise<boolean> => {
    try {
      await OneSignal.Notifications.requestPermission(true);

      return await checkPermissionStatus();
    } catch (error) {
      logError("Error requesting notification permission", error);
      return false;
    }
  };

  const contextValue: OneSignalContextType = {
    hasNotificationPermission,
    isPermissionResolved,
    registerForPushNotifications,
    checkPermissionStatus,
  };

  return (
    <OneSignalContext.Provider value={contextValue}>
      {children}
    </OneSignalContext.Provider>
  );
}
