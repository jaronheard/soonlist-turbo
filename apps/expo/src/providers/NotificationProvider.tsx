import type { Href } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";

interface NotificationContextType {
  expoPushToken: string;
  hasNotificationPermission: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};

function isNotificationData(data: unknown): data is NotificationData {
  return (
    typeof data === "object" &&
    data !== null &&
    "notificationId" in data &&
    typeof (data as NotificationData).notificationId === "string"
  );
}

function handleRegistrationError(errorMessage: string) {
  console.error(errorMessage);
  throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (finalStatus !== "granted") {
      handleRegistrationError(
        "Permission not granted to get push token for push notification!",
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const projectId: string | undefined =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError("Project ID not found");
    }
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log(pushTokenString);
      return pushTokenString;
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      handleRegistrationError(`${e}`);
    }
  } else {
    handleRegistrationError("Must use physical device for push notifications");
  }
}

interface NotificationData {
  url?: string;
  notificationId: string;
  [key: string]: unknown;
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);
  const [, setNotification] = useState<Notifications.Notification | undefined>(
    undefined,
  );
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const posthog = usePostHog();

  useEffect(() => {
    async function registerAndCheckPermissions() {
      try {
        const token = await registerForPushNotificationsAsync();
        setExpoPushToken(token ?? "");
      } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        setExpoPushToken(`${error}`);
      } finally {
        /*
         * After trying to register for push notifications,
         * confirm the final permission status:
         */
        const { status } = await Notifications.getPermissionsAsync();
        setHasNotificationPermission(
          status === ("granted" as Notifications.PermissionStatus),
        );
      }
    }

    void registerAndCheckPermissions();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
        const data = notification.request.content.data;
        if (!isNotificationData(data)) {
          console.error("Invalid notification data format");
          return;
        }
        try {
          posthog.capture("notification_received", {
            title: notification.request.content.title,
            body: notification.request.content.body,
            notificationId: data.notificationId,
            data: notification.request.content.data,
          });
        } catch (error) {
          console.error("Failed to capture notification event:", error);
        }
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (!isNotificationData(data)) {
          console.error("Invalid notification data format");
          return;
        }
        try {
          posthog.capture("notification_opened", {
            title: response.notification.request.content.title,
            body: response.notification.request.content.body,
            notificationId: data.notificationId,
            data: response.notification.request.content.data,
          });
        } catch (error) {
          console.error("Failed to capture notification event:", error);
        }
      });

    return () => {
      notificationListener.current &&
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      responseListener.current &&
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [posthog]);

  useEffect(() => {
    let isMounted = true;

    function redirect(notification: Notifications.Notification) {
      const data = notification.request.content.data;
      if (!isNotificationData(data)) {
        console.error("Invalid notification data format");
        return;
      }
      if (typeof data.url === "string") {
        try {
          posthog.capture("notification_deep_link", {
            title: notification.request.content.title,
            body: notification.request.content.body,
            notificationId: data.notificationId,
            data: notification.request.content.data,
          });
        } catch (error) {
          console.error("Failed to capture notification event:", error);
        }
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        router.push(data.url as Href);
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response?.notification) {
        return;
      }
      redirect(response.notification);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        redirect(response.notification);
      },
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [posthog]);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, hasNotificationPermission }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

Notifications.setNotificationHandler({
  // eslint-disable-next-line @typescript-eslint/require-await
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function sendPushNotification(expoPushToken: string) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: "Want in early?",
    body: "You can be one of the first. We want to learn together.",
    data: { someData: "goes here" },
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}
