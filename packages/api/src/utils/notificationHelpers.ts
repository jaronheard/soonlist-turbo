import type { ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import Expo from "expo-server-sdk";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@soonlist/db";
import { pushTokens } from "@soonlist/db/schema";

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

export async function sendNotificationToAllUserTokens({
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
  tickets?: ExpoPushTicket[];
  error?: string;
}> {
  try {
    // Fetch all valid push tokens for the user
    const userTokens = await db
      .select({
        expoPushToken: pushTokens.expoPushToken,
      })
      .from(pushTokens)
      .where(
        and(
          eq(pushTokens.userId, userId),
          sql`${pushTokens.expoPushToken} != 'Error: Must use physical device for push notifications'`,
        ),
      );

    if (!userTokens.length) {
      return {
        success: false,
        error: "No valid push tokens found for user",
      };
    }

    const notificationId = generateNotificationId();
    const messages: ExpoPushMessage[] = userTokens.map((token) => ({
      to: token.expoPushToken,
      sound: "default",
      title,
      subtitle,
      body,
      data: {
        url,
        notificationId,
      },
    }));

    // Send notifications in chunks as recommended by Expo
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending notification chunk:", error);
      }
    }

    // Track the notification in PostHog
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
        ticketIds: tickets.map((ticket) => getTicketId(ticket)),
        tokenCount: userTokens.length,
      },
    });

    return {
      success: true,
      tickets,
    };
  } catch (error) {
    console.error("Error sending notifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Modify the existing sendNotification function to use the new function
export async function sendNotification({
  title,
  subtitle,
  body,
  url,
  userId,
  eventId,
  source,
  method,
}: {
  expoPushToken?: string; // Made optional since we're not using it anymore
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
  // Instead of sending to a single token, use the new function to send to all tokens
  const result = await sendNotificationToAllUserTokens({
    userId,
    title,
    subtitle,
    body,
    url,
    eventId,
    source,
    method,
  });

  // Return the first ticket for backward compatibility
  return {
    success: result.success,
    ticket: result.tickets?.[0],
    error: result.error,
  };
}
