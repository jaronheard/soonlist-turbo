"use node";

const POSTHOG_API_URL = "https://app.posthog.com";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_API_URL;

export interface UserProperties {
  upcoming_created_events_count: number;
  upcoming_saved_events_count: number;
  upcoming_events_count: number;
  total_events_created: number;
  next_event_date: string | null;
  days_since_last_event_created: number | null;
}

export interface IdentifyUserParams {
  userId: string;
  properties: UserProperties;
}

/**
 * Batch identify multiple users in PostHog using the /batch endpoint
 */
export async function batchIdentifyUsers(
  users: IdentifyUserParams[],
): Promise<{
  success: boolean;
  successCount: number;
  failureCount: number;
  error?: string;
}> {
  if (!POSTHOG_KEY) {
    console.error("PostHog API key not configured");
    return {
      success: false,
      successCount: 0,
      failureCount: users.length,
      error: "PostHog API key not configured",
    };
  }

  try {
    const batch = users.map((user) => ({
      event: "$identify",
      distinct_id: user.userId,
      properties: {
        $set: user.properties,
      },
    }));

    const response = await fetch(`${POSTHOG_HOST}/batch/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ api_key: POSTHOG_KEY, batch }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PostHog API error: ${response.status} ${errorText}`);
    }

    return {
      success: true,
      successCount: users.length,
      failureCount: 0,
    };
  } catch (error) {
    console.error("Error batch identifying users in PostHog:", error);
    return {
      success: false,
      successCount: 0,
      failureCount: users.length,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
