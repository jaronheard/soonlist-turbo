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
      console.error("App scheme not configured in app.config.ts");
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
        console.error("Failed to open internal URL:", error, deepLink);
      });
    } else if (url.startsWith("http")) {
      // For external URLs, use Linking directly
      void Linking.openURL(url).catch((error) => {
        console.error("Failed to open external URL:", error, url);
      });
    } else {
      console.warn("Unrecognized URL format:", url);
    }
  } catch (error) {
    console.error("Failed to navigate to URL:", error);
  }
};

// Create a custom logger for OneSignal operations
const logOneSignal = (
  operation: string,
  message: string,
  data?: Record<string, unknown>,
) => {
  const logData = {
    operation,
    message,
    timestamp: new Date().toISOString(),
    ...(data || {}),
  };

  console.log(`[OneSignal] ${operation}: ${message}`, logData);

  // In a production app, you might want to send these logs to a service like Sentry
  // if available in the app context
};

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { userId, isSignedIn } = useAuth();
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const posthog = usePostHog();

  // Initialize OneSignal
  useEffect(() => {
    logOneSignal("Initialization", "Starting OneSignal initialization");

    const oneSignalAppId = Constants.expoConfig?.extra
      ?.oneSignalAppId as string;

    if (!oneSignalAppId) {
      logOneSignal("Error", "OneSignal App ID is not defined in app.config.ts");
      console.error("OneSignal App ID is not defined in app.config.ts");
      return;
    }

    logOneSignal("Config", "OneSignal configuration", {
      appId: oneSignalAppId,
      appVariant: Constants.expoConfig?.extra?.appVariant || "unknown",
      platform: Platform.OS,
    });

    // Enable logging for debugging (remove in production)
    // if (__DEV__) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    logOneSignal("Debug", "Set log level to Verbose");
    // }

    // Initialize the OneSignal SDK
    OneSignal.initialize(oneSignalAppId);
    logOneSignal("Initialization", "OneSignal SDK initialized", {
      oneSignalAppId,
    });

    // Check permission status
    void OneSignal.Notifications.permissionNative()
      .then((permission) => {
        // Check if permission is granted
        const isPermissionGranted =
          permission === OSNotificationPermission.Authorized ||
          permission === OSNotificationPermission.Provisional ||
          permission === OSNotificationPermission.Ephemeral;

        setHasNotificationPermission(isPermissionGranted);

        logOneSignal("Permissions", "Notification permission status checked", {
          permission,
          permissionStatus: String(permission),
          isPermissionGranted,
        });
      })
      .catch((error) => {
        logOneSignal("Error", "Error checking notification permission", {
          error: error instanceof Error ? error.message : String(error),
        });
        console.error("Error checking notification permission:", error);
      });

    // Set up notification handlers
    const setupNotificationListeners = () => {
      logOneSignal("Listeners", "Setting up notification listeners");

      // Handle foreground notifications
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        (event: NotificationWillDisplayEvent) => {
          logOneSignal("Notification", "Received foreground notification", {
            notificationId: event.notification.notificationId,
            title: event.notification.title,
            body: event.notification.body,
            data: event.notification.additionalData,
          });

          // Capture analytics
          try {
            posthog.capture("notification_received", {
              title: event.notification.title || "",
              body: event.notification.body || "",
              notificationId: event.notification.notificationId || "",
              data: event.notification.additionalData || {},
            });
          } catch (error) {
            logOneSignal(
              "Error",
              "Failed to capture notification event in PostHog",
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
            console.error("Failed to capture notification event:", error);
          }

          // Display the notification
          logOneSignal("Notification", "Displaying notification", {
            notificationId: event.notification.notificationId,
          });
          event.notification.display();
        },
      );

      // Handle notification clicks
      OneSignal.Notifications.addEventListener(
        "click",
        (event: NotificationClickEvent) => {
          logOneSignal("Notification", "Notification clicked", {
            notificationId: event.notification.notificationId,
            title: event.notification.title,
            body: event.notification.body,
            data: event.notification.additionalData,
          });

          try {
            posthog.capture("notification_opened", {
              title: event.notification.title || "",
              body: event.notification.body || "",
              notificationId: event.notification.notificationId || "",
              data: event.notification.additionalData || {},
            });
          } catch (error) {
            logOneSignal(
              "Error",
              "Failed to capture notification click event in PostHog",
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
            console.error("Failed to capture notification event:", error);
          }

          // Handle deep linking
          const data = event.notification.additionalData as
            | NotificationData
            | undefined;
          if (data?.url && typeof data.url === "string") {
            logOneSignal("DeepLink", "Processing deep link from notification", {
              url: data.url,
              notificationId: event.notification.notificationId,
            });

            try {
              posthog.capture("notification_deep_link", {
                title: event.notification.title || "",
                body: event.notification.body || "",
                notificationId: event.notification.notificationId || "",
                data: event.notification.additionalData || {},
                url: data.url,
              });
            } catch (error) {
              logOneSignal(
                "Error",
                "Failed to capture deep link event in PostHog",
                {
                  error: error instanceof Error ? error.message : String(error),
                },
              );
              console.error("Failed to capture notification event:", error);
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
      logOneSignal("Cleanup", "Clearing all notifications");
      OneSignal.Notifications.clearAll();
    };
  }, [posthog]);

  // Set external user ID when user signs in
  useEffect(() => {
    if (isSignedIn && userId) {
      logOneSignal("User", "Setting external user ID", { userId });

      // Set the external user ID
      OneSignal.login(userId);

      // Set user tags
      const tags = {
        userId: userId,
        platform: Platform.OS,
      };

      logOneSignal("User", "Adding user tags", tags);
      OneSignal.User.addTags(tags);
    } else {
      // Logout when user signs out
      logOneSignal("User", "User logged out, removing OneSignal association");
      OneSignal.logout();
    }
  }, [userId, isSignedIn]);

  // Function to check notification permission status
  const checkPermissionStatus = async (): Promise<boolean> => {
    logOneSignal("Permissions", "Checking notification permission status");

    try {
      const permission = await OneSignal.Notifications.permissionNative();
      const isPermissionGranted =
        permission === OSNotificationPermission.Authorized ||
        permission === OSNotificationPermission.Provisional ||
        permission === OSNotificationPermission.Ephemeral;

      setHasNotificationPermission(isPermissionGranted);

      logOneSignal("Permissions", "Permission status check completed", {
        permission,
        permissionStatus: String(permission),
        isPermissionGranted,
      });

      return isPermissionGranted;
    } catch (error) {
      logOneSignal("Error", "Error checking notification permission", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("Error checking notification permission:", error);
      return false;
    }
  };

  // Function to request notification permissions
  const registerForPushNotifications = async (): Promise<boolean> => {
    logOneSignal("Permissions", "Requesting push notification permissions");

    try {
      // The 'true' parameter forces the permission dialog to show
      // This should only be called during onboarding when the user explicitly agrees
      await OneSignal.Notifications.requestPermission(true);
      logOneSignal("Permissions", "Permission request dialog shown");

      // Check the permission status after requesting
      const result = await checkPermissionStatus();
      logOneSignal("Permissions", "Permission request result", {
        granted: result,
      });
      return result;
    } catch (error) {
      logOneSignal("Error", "Error requesting notification permission", {
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("Error requesting notification permission:", error);
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
