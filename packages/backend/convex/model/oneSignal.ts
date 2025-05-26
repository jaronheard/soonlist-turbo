"use node";

// OneSignal REST API base URL
const ONE_SIGNAL_API_URL = "https://onesignal.com/api/v1";

const IS_DEV = process.env.NODE_ENV === "development";

// OneSignal API key from environment variables
const ONE_SIGNAL_REST_API_KEY = IS_DEV
  ? process.env.ONE_SIGNAL_REST_API_KEY_DEV
  : process.env.ONE_SIGNAL_REST_API_KEY_PROD;

const EXPO_PUBLIC_ONE_SIGNAL_APP_ID = IS_DEV
  ? process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID_DEV
  : process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID_PROD;

// Check if OneSignal is properly configured
if (!ONE_SIGNAL_REST_API_KEY || !EXPO_PUBLIC_ONE_SIGNAL_APP_ID) {
  console.warn(
    "OneSignal API key or App ID not configured. Notifications will not be sent.",
  );
}

export interface SendNotificationParams {
  userId: string;
  title: string;
  subtitle?: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
  notificationId?: string;
  source?: string;
  method?: string;
  eventId?: string;
}

// OneSignal API response types
interface OneSignalSuccessResponse {
  id: string;
  recipients: number;
  external_id?: string;
  errors?: never;
}

interface OneSignalErrorResponse {
  id?: never;
  recipients?: never;
  errors: Record<string, string[]>;
}

type OneSignalResponse = OneSignalSuccessResponse | OneSignalErrorResponse;

/**
 * Sends a notification to a specific user using OneSignal's API
 */
export async function sendNotification({
  userId,
  title,
  subtitle,
  body,
  url,
  data,
  notificationId,
  source: _source,
  method: _method,
  eventId: _eventId,
}: SendNotificationParams): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  // If OneSignal is not configured, log and return early
  if (!ONE_SIGNAL_REST_API_KEY || !EXPO_PUBLIC_ONE_SIGNAL_APP_ID) {
    console.error("OneSignal API key or App ID not configured");
    return {
      success: false,
      error: "OneSignal API key or App ID not configured",
    };
  }

  // Generate a notification ID if not provided
  const finalNotificationId = notificationId || crypto.randomUUID();

  try {
    // Prepare the notification payload
    const payload = {
      app_id: EXPO_PUBLIC_ONE_SIGNAL_APP_ID,
      include_external_user_ids: [userId],
      channel_for_external_user_ids: "push",
      headings: { en: title },
      contents: { en: body },
      subtitle: subtitle ? { en: subtitle } : undefined,
      data: {
        ...(data || {}),
        url,
        notificationId: finalNotificationId,
      },
      url: url,
    };

    // Send the notification using OneSignal's REST API
    const response = await fetch(`${ONE_SIGNAL_API_URL}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as OneSignalResponse;

    if (!response.ok) {
      throw new Error(
        `OneSignal API error: ${response.status} ${
          "errors" in result && result.errors
            ? JSON.stringify(result.errors)
            : "Unknown error"
        }`,
      );
    }

    return {
      success: true,
      id: "id" in result ? result.id : undefined,
    };
  } catch (error) {
    console.error("Error sending OneSignal notification:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Sends a notification to multiple users using OneSignal's API
 */
export async function sendBatchNotifications({
  userIds,
  title,
  body,
  url,
  data,
}: {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}): Promise<{
  success: boolean;
  id?: string;
  error?: string;
  recipients?: number;
}> {
  // If OneSignal is not configured, log and return early
  if (!ONE_SIGNAL_REST_API_KEY || !EXPO_PUBLIC_ONE_SIGNAL_APP_ID) {
    console.error("OneSignal API key or App ID not configured");
    return {
      success: false,
      error: "OneSignal API key or App ID not configured",
    };
  }

  try {
    // Prepare the notification payload
    const payload = {
      app_id: EXPO_PUBLIC_ONE_SIGNAL_APP_ID,
      include_external_user_ids: userIds,
      channel_for_external_user_ids: "push",
      headings: { en: title },
      contents: { en: body },
      data: {
        ...(data || {}),
        url,
      },
      url: url,
    };

    // Send the notification using OneSignal's REST API
    const response = await fetch(`${ONE_SIGNAL_API_URL}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as OneSignalResponse;

    if (!response.ok) {
      throw new Error(
        `OneSignal API error: ${response.status} ${
          "errors" in result && result.errors
            ? JSON.stringify(result.errors)
            : "Unknown error"
        }`,
      );
    }

    return {
      success: true,
      id: "id" in result ? result.id : undefined,
      recipients: "recipients" in result ? result.recipients : 0,
    };
  } catch (error) {
    console.error("Error sending OneSignal batch notifications:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
