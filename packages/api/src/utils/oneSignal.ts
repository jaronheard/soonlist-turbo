import { posthog } from "./posthog";

// OneSignal REST API base URL
const ONE_SIGNAL_API_URL = "https://onesignal.com/api/v1";

// OneSignal API key from environment variables
const IS_DEV = process.env.APP_VARIANT === "development";

const ONE_SIGNAL_REST_API_KEY = IS_DEV
  ? process.env.ONE_SIGNAL_REST_API_KEY_DEV
  : process.env.ONE_SIGNAL_REST_API_KEY_PROD;

const ONE_SIGNAL_APP_ID = IS_DEV
  ? process.env.ONE_SIGNAL_APP_ID_DEV
  : process.env.ONE_SIGNAL_APP_ID_PROD;

// Create a custom logger for OneSignal operations
const logOneSignalServer = (
  operation: string,
  message: string,
  data?: Record<string, unknown>,
) => {
  const logData = {
    operation,
    message,
    timestamp: new Date().toISOString(),
    environment: IS_DEV ? "development" : "production",
    ...(data || {}),
  };

  console.log(`[OneSignal Server] ${operation}: ${message}`, logData);

  // In a production environment, you might want to send these logs
  // to a monitoring service like Sentry or CloudWatch
};

// Log configuration status at startup
logOneSignalServer("Config", "OneSignal server configuration loaded", {
  isConfigured: !!(ONE_SIGNAL_REST_API_KEY && ONE_SIGNAL_APP_ID),
  environment: IS_DEV ? "development" : "production",
  appId: ONE_SIGNAL_APP_ID ? "present" : "missing",
  apiKey: ONE_SIGNAL_REST_API_KEY ? "present" : "missing",
});

// Check if OneSignal is properly configured
if (!ONE_SIGNAL_REST_API_KEY || !ONE_SIGNAL_APP_ID) {
  console.warn(
    "OneSignal API key or App ID not configured. Notifications will not be sent.",
  );
  logOneSignalServer("Error", "OneSignal API key or App ID not configured");
}

interface SendNotificationParams {
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
  source,
  method,
  eventId,
}: SendNotificationParams): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  logOneSignalServer("Notification", "Preparing to send notification", {
    userId,
    title,
    subtitle: subtitle || "",
    method,
    source,
    eventId,
  });

  // If OneSignal is not configured, log and return early
  if (!ONE_SIGNAL_REST_API_KEY || !ONE_SIGNAL_APP_ID) {
    logOneSignalServer("Error", "OneSignal API key or App ID not configured");
    console.error("OneSignal API key or App ID not configured");
    return {
      success: false,
      error: "OneSignal API key or App ID not configured",
    };
  }

  // Generate a notification ID if not provided
  const finalNotificationId = notificationId || crypto.randomUUID();
  logOneSignalServer("Notification", "Generated notification ID", {
    notificationId: finalNotificationId,
  });

  try {
    // Prepare the notification payload
    const payload = {
      app_id: ONE_SIGNAL_APP_ID,
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

    logOneSignalServer("Notification", "Prepared notification payload", {
      userId,
      title,
      body,
      notificationId: finalNotificationId,
      hasUrl: !!url,
      hasCustomData: !!data,
    });

    // Send the notification using OneSignal's REST API
    logOneSignalServer("API", "Sending request to OneSignal API", {
      endpoint: `${ONE_SIGNAL_API_URL}/notifications`,
      method: "POST",
    });

    const response = await fetch(`${ONE_SIGNAL_API_URL}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as OneSignalResponse;

    logOneSignalServer("API", "Received response from OneSignal API", {
      status: response.status,
      isSuccess: response.ok,
      recipients: "recipients" in result ? result.recipients : 0,
      id: "id" in result ? result.id : undefined,
      hasErrors: "errors" in result,
      errors: "errors" in result ? result.errors : undefined,
    });

    if (!response.ok) {
      const errorMessage = `OneSignal API error: ${response.status} ${
        "errors" in result && result.errors
          ? JSON.stringify(result.errors)
          : "Unknown error"
      }`;

      logOneSignalServer("Error", errorMessage, {
        status: response.status,
        errors: "errors" in result ? result.errors : {},
        userId,
        notificationId: finalNotificationId,
      });

      throw new Error(errorMessage);
    }

    // Track the notification in PostHog
    logOneSignalServer("Analytics", "Tracking notification in PostHog", {
      userId,
      notificationId: finalNotificationId,
      oneSignalId: "id" in result ? result.id : undefined,
    });

    posthog.capture({
      distinctId: userId,
      event: "notification_sent",
      properties: {
        success: true,
        notificationId: finalNotificationId,
        type: "onesignal",
        eventId,
        title,
        source,
        method,
        oneSignalId: "id" in result ? result.id : undefined,
      },
    });

    logOneSignalServer("Success", "Successfully sent notification", {
      userId,
      notificationId: finalNotificationId,
      oneSignalId: "id" in result ? result.id : undefined,
      recipients: "recipients" in result ? result.recipients : 0,
    });

    return {
      success: true,
      id: "id" in result ? result.id : undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logOneSignalServer("Error", "Error sending OneSignal notification", {
      error: errorMessage,
      userId,
      notificationId: finalNotificationId,
      stack: error instanceof Error ? error.stack : undefined,
    });

    console.error("Error sending OneSignal notification:", error);

    // Track the error in PostHog
    posthog.capture({
      distinctId: userId,
      event: "notification_sent",
      properties: {
        success: false,
        notificationId: finalNotificationId,
        type: "onesignal",
        eventId,
        title,
        source,
        method,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

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
  logOneSignalServer(
    "BatchNotification",
    "Preparing to send batch notification",
    {
      userCount: userIds.length,
      title,
      body,
      hasUrl: !!url,
      hasCustomData: !!data,
    },
  );

  // If OneSignal is not configured, log and return early
  if (!ONE_SIGNAL_REST_API_KEY || !ONE_SIGNAL_APP_ID) {
    logOneSignalServer("Error", "OneSignal API key or App ID not configured");
    console.error("OneSignal API key or App ID not configured");
    return {
      success: false,
      error: "OneSignal API key or App ID not configured",
    };
  }

  try {
    // Prepare the notification payload
    const payload = {
      app_id: ONE_SIGNAL_APP_ID,
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

    logOneSignalServer(
      "BatchNotification",
      "Prepared batch notification payload",
      {
        userCount: userIds.length,
        sampleUsers: userIds.slice(0, 3), // Log just a few users for debugging
        title,
        body,
      },
    );

    // Send the notification using OneSignal's REST API
    logOneSignalServer("API", "Sending batch request to OneSignal API", {
      endpoint: `${ONE_SIGNAL_API_URL}/notifications`,
      method: "POST",
      userCount: userIds.length,
    });

    const response = await fetch(`${ONE_SIGNAL_API_URL}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as OneSignalResponse;

    logOneSignalServer("API", "Received batch response from OneSignal API", {
      status: response.status,
      isSuccess: response.ok,
      recipients: "recipients" in result ? result.recipients : 0,
      id: "id" in result ? result.id : undefined,
      hasErrors: "errors" in result,
      errors: "errors" in result ? result.errors : undefined,
    });

    if (!response.ok) {
      const errorMessage = `OneSignal API error: ${response.status} ${
        "errors" in result && result.errors
          ? JSON.stringify(result.errors)
          : "Unknown error"
      }`;

      logOneSignalServer("Error", errorMessage, {
        status: response.status,
        errors: "errors" in result ? result.errors : {},
        userCount: userIds.length,
      });

      throw new Error(errorMessage);
    }

    // Track the batch notification in PostHog
    logOneSignalServer("Analytics", "Tracking batch notification in PostHog", {
      userCount: userIds.length,
      recipients: "recipients" in result ? result.recipients : 0,
      oneSignalId: "id" in result ? result.id : undefined,
    });

    posthog.capture({
      distinctId: "system",
      event: "batch_notifications_sent",
      properties: {
        success: true,
        type: "onesignal",
        oneSignalId: "id" in result ? result.id : undefined,
        recipients: "recipients" in result ? result.recipients : 0,
        totalUsers: userIds.length,
      },
    });

    logOneSignalServer("Success", "Successfully sent batch notification", {
      userCount: userIds.length,
      recipients: "recipients" in result ? result.recipients : 0,
      oneSignalId: "id" in result ? result.id : undefined,
    });

    return {
      success: true,
      id: "id" in result ? result.id : undefined,
      recipients: "recipients" in result ? result.recipients : 0,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logOneSignalServer("Error", "Error sending OneSignal batch notifications", {
      error: errorMessage,
      userCount: userIds.length,
      stack: error instanceof Error ? error.stack : undefined,
    });

    console.error("Error sending OneSignal batch notifications:", error);

    // Track the error in PostHog
    posthog.capture({
      distinctId: "system",
      event: "batch_notifications_sent",
      properties: {
        success: false,
        type: "onesignal",
        error: error instanceof Error ? error.message : "Unknown error",
        totalUsers: userIds.length,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
