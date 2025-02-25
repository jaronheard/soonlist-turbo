import React, { useEffect } from "react";
import { Platform } from "react-native";
import { LogLevel, OneSignal } from "react-native-onesignal";
import Constants from "expo-constants";
import { useAuth } from "@clerk/clerk-expo";

interface OneSignalProviderProps {
  children: React.ReactNode;
}

export function OneSignalProvider({ children }: OneSignalProviderProps) {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    // Initialize OneSignal
    const oneSignalAppId = Constants.expoConfig?.extra
      ?.oneSignalAppId as string;

    if (!oneSignalAppId) {
      console.error("OneSignal App ID is not defined in app.config.ts");
      return;
    }

    // Enable logging for debugging (remove in production)
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    // Initialize the OneSignal SDK
    OneSignal.initialize(oneSignalAppId);

    // Prompt for push notifications
    OneSignal.Notifications.requestPermission(true);

    // Set up event listeners using a type assertion to avoid TypeScript errors
    const setupNotificationListeners = () => {
      // Handle foreground notifications
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event: any) => {
          event.notification.display();
        },
      );

      // Handle notification clicks
      OneSignal.Notifications.addEventListener(
        "click",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event: any) => {
          console.log("OneSignal: notification clicked:", event);
        },
      );
    };

    setupNotificationListeners();
  }, []);

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

  return <>{children}</>;
}
