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
import { usePostHog } from "posthog-react-native";

import { logError } from "~/utils/errorLogging";

interface OneSignalContextType {
  hasNotificationPermission: boolean;
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

// Type for notification additional data
interface NotificationData {
  url?: string;
  [key: string]: unknown;
}

// Helper function to safely handle navigation
const handleNavigation = (url: string) => {
  try {
    // Get the app scheme from Constants
    const appScheme = Constants.expoConfig?.scheme;

    if (!appScheme) {
      logError(
        "App scheme not configured",
        new Error("App scheme not configured in app.config.ts"),
      );
      return;
    }

    // Handle different URL types
    if (url.startsWith("/")) {
      // For internal routes, create a proper deep link URL with the app scheme
      // This approach works with Expo Router's deep linking system
      const deepLink = Array.isArray(appScheme)
        ? `${appScheme[0]}:${url}`
        : `${appScheme}:${url}`;

      // Use Linking to open the URL
      void Linking.openURL(deepLink).catch((error) => {
        logError("Failed to open internal URL", error, { deepLink });
      });
    } else if (url.startsWith("http")) {
      // For external URLs, use Linking directly
      void Linking.openURL(url).catch((error) => {
        logError("Failed to open external URL", error, { url });
      });
    } else {
      console.warn("Unrecognized URL format:", url);
    }
  } catch (error) {
    logError("Failed to navigate to URL", error, { url });
  }
};

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { userId, isSignedIn } = useAuth();
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const posthog = usePostHog();

  // Initialize OneSignal
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

    // Enable logging for debugging (remove in production)
    // if (__DEV__) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    // }

    // Initialize the OneSignal SDK
    OneSignal.initialize(oneSignalAppId);

    // Check permission status
    void OneSignal.Notifications.permissionNative()
      .then((permission) => {
        // Check if permission is granted
        setHasNotificationPermission(
          permission === OSNotificationPermission.Authorized ||
            permission === OSNotificationPermission.Provisional ||
            permission === OSNotificationPermission.Ephemeral,
        );
      })
      .catch((error) => {
        logError("Error checking notification permission", error);
      });

    // Set up notification handlers
    const setupNotificationListeners = () => {
      // Handle foreground notifications
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        (event: NotificationWillDisplayEvent) => {
          // Capture analytics
          try {
            posthog.capture("notification_received", {
              title: event.notification.title || "",
              body: event.notification.body || "",
              notificationId: event.notification.notificationId || "",
              data: event.notification.additionalData || {},
            });
          } catch (error) {
            logError("Failed to capture notification event", error, {
              event: "foregroundWillDisplay",
            });
          }

          // Display the notification
          event.notification.display();
        },
      );

      // Handle notification clicks
      OneSignal.Notifications.addEventListener(
        "click",
        (event: NotificationClickEvent) => {
          try {
            posthog.capture("notification_opened", {
              title: event.notification.title || "",
              body: event.notification.body || "",
              notificationId: event.notification.notificationId || "",
              data: event.notification.additionalData || {},
            });
          } catch (error) {
            logError("Failed to capture notification event", error, {
              event: "click",
            });
          }

          // Handle deep linking
          const data = event.notification.additionalData as
            | NotificationData
            | undefined;
          if (data?.url && typeof data.url === "string") {
            try {
              posthog.capture("notification_deep_link", {
                title: event.notification.title || "",
                body: event.notification.body || "",
                notificationId: event.notification.notificationId || "",
                data: event.notification.additionalData || {},
                url: data.url,
              });
            } catch (error) {
              logError("Failed to capture notification event", error, {
                event: "deep_link",
              });
            }

            // Use our helper function to handle navigation
            handleNavigation(data.url);
          }
        },
      );
    };

    setupNotificationListeners();

    // Cleanup
    return () => {
      OneSignal.Notifications.clearAll();
    };
  }, [posthog]);

  // Set external user ID when user signs in
  useEffect(() => {
    if (isSignedIn && userId) {
      // Set the external user ID
      OneSignal.login(userId);

      // Set user tags
      OneSignal.User.addTags({
        userId: userId,
        platform: Platform.OS,
      });
    } else {
      // Logout when user signs out
      OneSignal.logout();
    }
  }, [userId, isSignedIn]);

  // Function to check notification permission status
  const checkPermissionStatus = async (): Promise<boolean> => {
    try {
      const permission = await OneSignal.Notifications.permissionNative();
      const isPermissionGranted =
        permission === OSNotificationPermission.Authorized ||
        permission === OSNotificationPermission.Provisional ||
        permission === OSNotificationPermission.Ephemeral;

      setHasNotificationPermission(isPermissionGranted);
      return isPermissionGranted;
    } catch (error) {
      logError("Error checking notification permission", error);
      return false;
    }
  };

  // Function to request notification permissions
  const registerForPushNotifications = async (): Promise<boolean> => {
    try {
      // The 'true' parameter forces the permission dialog to show
      // This should only be called during onboarding when the user explicitly agrees
      await OneSignal.Notifications.requestPermission(true);

      // Check the permission status after requesting
      return await checkPermissionStatus();
    } catch (error) {
      logError("Error requesting notification permission", error);
      return false;
    }
  };

  // Provide context values
  const contextValue: OneSignalContextType = {
    hasNotificationPermission,
    registerForPushNotifications,
    checkPermissionStatus,
  };

  return (
    <OneSignalContext.Provider value={contextValue}>
      {children}
    </OneSignalContext.Provider>
  );
}
