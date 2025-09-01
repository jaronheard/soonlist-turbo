"use node";

// OneSignal REST API base URL
const ONE_SIGNAL_API_URL = "https://onesignal.com/api/v1";

// Use CONVEX_ENV for explicit environment detection, fallback to NODE_ENV
const ENV = process.env.CONVEX_ENV || process.env.NODE_ENV || "production";
const IS_DEV = ENV === "development";

// Log environment detection for debugging (gate to development)
if (IS_DEV) {
  console.log("OneSignal Environment Detection:", {
    CONVEX_ENV: process.env.CONVEX_ENV,
    NODE_ENV: process.env.NODE_ENV,
    ENV,
    IS_DEV,
  });
}

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
    {
      hasApiKey: !!ONE_SIGNAL_REST_API_KEY,
      hasAppId: !!EXPO_PUBLIC_ONE_SIGNAL_APP_ID,
      environment: IS_DEV ? "development" : "production",
    },
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

export interface ScheduleTimezoneParams {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
  externalId?: string; // Optional OneSignal idempotency key
  includedSegments?: string[]; // Defaults to ["Subscribed Users"] if not provided
  includeExternalUserIds?: string[]; // Optional explicit targeting by external user ids
  sendAfter?: string; // RFC2822/HTTP date string; OneSignal also accepts "YYYY-MM-DD HH:MM:SS GMT-XXXX"
  deliveryTimeOfDay?: string; // e.g. "9:00AM"
}

// Normalize a date to OneSignal's documented format when the input is UTC.
// Otherwise, return the original string.
function normalizeSendAfterIfUTC(ms: number, original: string): string {
  const isUTC =
    original.endsWith("Z") ||
    original.endsWith("GMT+0000") ||
    original.endsWith("GMT-0000") ||
    original.endsWith("GMT") ||
    original.endsWith("+00:00") ||
    original.endsWith("-00:00");
  if (!isUTC) return original;
  const d = new Date(ms);
  const YYYY = d.getUTCFullYear();
  const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(d.getUTCDate()).padStart(2, "0");
  const HH = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss} GMT+0000`;
}

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
    console.error("OneSignal API key or App ID not configured", {
      userId,
      title,
      environment: IS_DEV ? "development" : "production",
      hasApiKey: !!ONE_SIGNAL_REST_API_KEY,
      hasAppId: !!EXPO_PUBLIC_ONE_SIGNAL_APP_ID,
    });
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

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

    if (IS_DEV) {
      console.log("OneSignal notification sent successfully", {
        userId,
        title,
        oneSignalId: "id" in result ? result.id : undefined,
        environment: IS_DEV ? "development" : "production",
      });
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
    console.error("OneSignal API key or App ID not configured", {
      userIds: userIds.length,
      title,
      environment: IS_DEV ? "development" : "production",
      hasApiKey: !!ONE_SIGNAL_REST_API_KEY,
      hasAppId: !!EXPO_PUBLIC_ONE_SIGNAL_APP_ID,
    });
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

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

/**
 * Schedule a notification to deliver at a specific local time for each user (timezone-aware).
 * Uses OneSignal's delayed_option: "timezone" with delivery_time_of_day.
 */
export async function scheduleTimezoneNotification({
  title,
  body,
  url,
  data,
  externalId,
  includedSegments,
  includeExternalUserIds,
  sendAfter,
  deliveryTimeOfDay,
}: ScheduleTimezoneParams): Promise<{
  success: boolean;
  id?: string;
  error?: string;
  recipients?: number;
}> {
  if (!ONE_SIGNAL_REST_API_KEY || !EXPO_PUBLIC_ONE_SIGNAL_APP_ID) {
    console.error("OneSignal API key or App ID not configured", {
      title,
      environment: IS_DEV ? "development" : "production",
      hasApiKey: !!ONE_SIGNAL_REST_API_KEY,
      hasAppId: !!EXPO_PUBLIC_ONE_SIGNAL_APP_ID,
    });
    return {
      success: false,
      error: "OneSignal API key or App ID not configured",
    };
  }

  // Optional: validate deliveryTimeOfDay string matches OneSignal’s expected pattern ("H:MMAM/PM")
  const deliveryPattern = /^(?:[1-9]|1[0-2]):[0-5][0-9](?:AM|PM)$/;
  if (deliveryTimeOfDay && !deliveryPattern.test(deliveryTimeOfDay)) {
    return {
      success: false,
      error: "Invalid deliveryTimeOfDay format. Expected e.g. '9:00AM'",
    };
  }

  try {
    const payload: Record<string, unknown> = {
      app_id: EXPO_PUBLIC_ONE_SIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body },
      data: { ...(data || {}), url },
      url,
      delayed_option: "timezone",
      delivery_time_of_day: deliveryTimeOfDay || "9:00AM",
    };

    if (externalId) {
      Object.assign(payload, { external_id: externalId });
    }

    if (includeExternalUserIds && includeExternalUserIds.length > 0) {
      Object.assign(payload, {
        include_external_user_ids: includeExternalUserIds,
        channel_for_external_user_ids: "push",
      });
    } else {
      Object.assign(payload, {
        included_segments:
          includedSegments && includedSegments.length > 0
            ? includedSegments
            : ["Subscribed Users"],
      });
    }

    if (sendAfter) {
      const ms = Date.parse(sendAfter);
      if (Number.isNaN(ms)) {
        return {
          success: false,
          error: "Invalid sendAfter format for OneSignal",
        };
      }
      const normalized = normalizeSendAfterIfUTC(ms, sendAfter);
      Object.assign(payload, { send_after: normalized });
    }

    const response = await fetch(`${ONE_SIGNAL_API_URL}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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

    const successPayload = {
      success: true,
      id: "id" in result ? result.id : undefined,
      recipients: "recipients" in result ? result.recipients : 0,
    } as const;
    if (IS_DEV) {
      console.log("OneSignal timezone notification scheduled", successPayload);
    }
    return successPayload;
  } catch (error) {
    console.error("Error scheduling OneSignal timezone notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
