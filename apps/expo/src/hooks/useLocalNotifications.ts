import * as Notifications from "expo-notifications";

interface NotificationOptions {
  title: string;
  body: string;
}

export function useLocalNotifications() {
  const scheduleNotification = async ({ title, body }: NotificationOptions) => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status !== "granted") {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== "granted") {
          console.log("Notification permission not granted");
          return;
        }
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  return { scheduleNotification };
}

