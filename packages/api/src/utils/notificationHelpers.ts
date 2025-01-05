import type { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import Expo from "expo-server-sdk";

import { getTicketId } from "./expo";
import { generateNotificationId } from "./notification";
import { posthog } from "./posthog";

// Create a single Expo SDK client to be reused
const expo = new Expo();

interface NotificationContent {
  title: string;
  subtitle: string;
  body: string;
}

export function getNotificationContent(
  eventName: string,
  count: number,
): NotificationContent {
  if (count === 1) {
    return {
      title: "Event captured ✨",
      body: "First capture today! 🤔 What's next?",
      subtitle: eventName,
    };
  } else if (count === 2) {
    return {
      title: "Event captured ✨",
      body: "2 captures today! ✌️ Keep 'em coming!",
      subtitle: eventName,
    };
  } else if (count === 3) {
    return {
      title: "Event captured ✨",
      body: "3 captures today! 🔥 You're on fire!",
      subtitle: eventName,
    };
  } else {
    return {
      title: "Event captured ✨",
      body: `${count} captures today! 🌌 The sky's the limit!`,
      subtitle: eventName,
    };
  }
}

export async function sendNotification({
  expoPushToken,
  title,
  subtitle,
  body,
  url,
  userId,
  eventId,
  source,
  method,
}: {
  expoPushToken: string;
  title: string;
  subtitle: string;
  body: string;
  url: string;
  userId: string;
  eventId?: string;
  source?: string;
  method?: string;
}): Promise<{
  success: boolean;
  ticket?: ExpoPushTicket;
  error?: string;
}> {
  const notificationId = generateNotificationId();
  const message: ExpoPushMessage = {
    to: expoPushToken,
    sound: "default",
    title,
    subtitle,
    body,
    data: {
      url,
      notificationId,
    },
  };

  try {
    const [ticket] = await expo.sendPushNotificationsAsync([message]);
    posthog.capture({
      distinctId: userId,
      event: "notification_sent",
      properties: {
        success: true,
        notificationId,
        type: "event_creation",
        eventId,
        title,
        source,
        method,
        ticketId: getTicketId(ticket),
      },
    });

    return {
      success: true,
      ticket,
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
