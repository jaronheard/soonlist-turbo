import { generatePublicId } from "../utils";
import { sendNotification as sendOneSignalNotification } from "./oneSignal";

export interface NotificationMetadata {
  notificationId: string;
  type: "event_creation" | "weekly" | "single";
  source?: "ai_router" | "notification_router";
  method?: "rawText" | "image" | "url";
  eventId?: string;
}

export function generateNotificationId(): string {
  return `not_${generatePublicId()}`;
}

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
  userId,
  title,
  subtitle,
  body,
  url,
  eventId,
  source,
  method,
}: {
  userId: string;
  title: string;
  subtitle: string;
  body: string;
  url: string;
  eventId?: string;
  source?: string;
  method?: string;
}): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const notificationId = generateNotificationId();

  return sendOneSignalNotification({
    userId,
    title,
    subtitle,
    body,
    url,
    notificationId,
    eventId,
    source,
    method,
  });
}
