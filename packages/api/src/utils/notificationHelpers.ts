import { generateNotificationId } from "./notification";
import { sendNotification as sendOneSignalNotification } from "./oneSignal";

// Logger for notification operations
const logNotificationHelper = (
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

  console.log(`[NotificationHelper] ${operation}: ${message}`, logData);
};

interface NotificationContent {
  title: string;
  subtitle: string;
  body: string;
}

export function getNotificationContent(
  eventName: string,
  count: number,
): NotificationContent {
  logNotificationHelper("Content", "Generating notification content", {
    eventName,
    count,
  });

  let content: NotificationContent;

  if (count === 1) {
    content = {
      title: "Event captured ✨",
      body: "First capture today! 🤔 What's next?",
      subtitle: eventName,
    };
  } else if (count === 2) {
    content = {
      title: "Event captured ✨",
      body: "2 captures today! ✌️ Keep 'em coming!",
      subtitle: eventName,
    };
  } else if (count === 3) {
    content = {
      title: "Event captured ✨",
      body: "3 captures today! 🔥 You're on fire!",
      subtitle: eventName,
    };
  } else {
    content = {
      title: "Event captured ✨",
      body: `${count} captures today! 🌌 The sky's the limit!`,
      subtitle: eventName,
    };
  }

  logNotificationHelper("Content", "Generated notification content", {
    eventName,
    count,
    title: content.title,
    body: content.body,
    subtitle: content.subtitle,
  });

  return content;
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

  logNotificationHelper("Send", "Preparing to send notification", {
    userId,
    title,
    subtitle,
    notificationId,
    eventId,
    source,
    method,
  });

  try {
    const result = await sendOneSignalNotification({
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

    if (result.success) {
      logNotificationHelper("Send", "Successfully sent notification", {
        userId,
        notificationId,
        oneSignalId: result.id,
      });
    } else {
      logNotificationHelper("Error", "Failed to send notification", {
        userId,
        notificationId,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logNotificationHelper("Error", "Exception while sending notification", {
      userId,
      notificationId,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}
