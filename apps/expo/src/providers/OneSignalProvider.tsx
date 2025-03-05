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
  // Native OS permission status (iOS/Android permission dialog)
  hasNotificationPermission: boolean;
  // Whether the device is actually subscribed with OneSignal's service
  isSubscribedToOneSignal: boolean;
  // Register for push notifications (requests permission if needed and ensures OneSignal subscription)
  registerForPushNotifications: () => Promise<boolean>;
  // Check the current permission and subscription status
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

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { userId, isSignedIn } = useAuth();
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const [isSubscribedToOneSignal, setIsSubscribedToOneSignal] = useState(false);
  const posthog = usePostHog();

  // Initialize OneSignal
  useEffect(() => {
    const oneSignalAppId = Constants.expoConfig?.extra
      ?.oneSignalAppId as string;

    if (!oneSignalAppId) {
      console.error("OneSignal App ID is not defined in app.config.ts");
      return;
    }

    // Enable logging for debugging (remove in production)
    // if (__DEV__) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    // }

    // Initialize the OneSignal SDK
    OneSignal.initialize(oneSignalAppId);

    // Check permission and subscription status
    void checkPermissionAndSubscriptionStatus();

    // Set up notification handlers
    const setupNotificationListeners = () => {
      // Define handlers as named functions so we can remove them later
      const foregroundHandler = (event: NotificationWillDisplayEvent) => {
        // Capture analytics
        try {
          posthog.capture("notification_received", {
            title: event.notification.title || "",
            body: event.notification.body || "",
            notificationId: event.notification.notificationId || "",
            data: event.notification.additionalData || {},
          });
        } catch (error) {
          console.error("Failed to capture notification event:", error);
        }

        // Display the notification
        event.notification.display();
      };

      // Handle notification clicks
      const clickHandler = (event: NotificationClickEvent) => {
        try {
          posthog.capture("notification_opened", {
            title: event.notification.title || "",
            body: event.notification.body || "",
            notificationId: event.notification.notificationId || "",
            data: event.notification.additionalData || {},
          });
        } catch (error) {
          console.error("Failed to capture notification event:", error);
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
            console.error("Failed to capture notification event:", error);
          }

          // Use our helper function to handle navigation
          handleNavigation(data.url);
        }
      };

      // Add event listeners
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        foregroundHandler,
      );
      OneSignal.Notifications.addEventListener("click", clickHandler);

      // Return the handlers so they can be used in cleanup
      return { foregroundHandler, clickHandler };
    };

    // Store handlers returned from setup
    const handlers = setupNotificationListeners();

    // Cleanup
    return () => {
      OneSignal.Notifications.clearAll();
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        handlers.foregroundHandler,
      );
      OneSignal.Notifications.removeEventListener(
        "click",
        handlers.clickHandler,
      );
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

  // Check both native permissions and OneSignal subscription status
  const checkPermissionAndSubscriptionStatus = async () => {
    try {
      // 1. Check native OS permission (iOS/Android permission dialog)
      const permission = await OneSignal.Notifications.permissionNative();
      const isPermissionGranted =
        permission === OSNotificationPermission.Authorized ||
        permission === OSNotificationPermission.Provisional ||
        permission === OSNotificationPermission.Ephemeral;

      setHasNotificationPermission(isPermissionGranted);

      // 2. Check if the device is actually subscribed with OneSignal's service
      // A user might have OS permission but not be registered with OneSignal
      const isOptedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
      setIsSubscribedToOneSignal(isOptedIn);

      return isPermissionGranted;
    } catch (error) {
      console.error("Error checking notification status:", error);
      return false;
    }
  };

  // Function to check notification permission status
  const checkPermissionStatus = async (): Promise<boolean> => {
    return checkPermissionAndSubscriptionStatus();
  };

  // Function to request notification permissions and ensure OneSignal subscription
  const registerForPushNotifications = async (): Promise<boolean> => {
    try {
      // 1. Request native OS permission if needed
      if (!hasNotificationPermission) {
        // The 'true' parameter forces the permission dialog to show
        await OneSignal.Notifications.requestPermission(true);
      }

      // Check if we got native OS permission
      const permission = await OneSignal.Notifications.permissionNative();
      const isPermissionGranted =
        permission === OSNotificationPermission.Authorized ||
        permission === OSNotificationPermission.Provisional ||
        permission === OSNotificationPermission.Ephemeral;

      setHasNotificationPermission(isPermissionGranted);

      if (isPermissionGranted) {
        // 2. Force push subscription registration with OneSignal
        // This ensures the device is actually registered with OneSignal's service
        // Even if the user already granted OS permissions, they might not be subscribed
        OneSignal.User.pushSubscription.optIn();

        // Update subscription state
        setIsSubscribedToOneSignal(true);
      }

      // Both native permission and OneSignal subscription are required
      return (
        isPermissionGranted &&
        (await OneSignal.User.pushSubscription.getOptedInAsync())
      );
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return false;
    }
  };

  // Provide context values
  const contextValue: OneSignalContextType = {
    hasNotificationPermission,
    isSubscribedToOneSignal,
    registerForPushNotifications,
    checkPermissionStatus,
  };

  return (
    <OneSignalContext.Provider value={contextValue}>
      {children}
    </OneSignalContext.Provider>
  );
}
