import { generatePublicId } from "../utils";
import { sendNotificationToAllUserTokens } from "./notificationHelpers";

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

export { sendNotificationToAllUserTokens };
