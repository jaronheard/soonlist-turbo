"use node";

const POSTHOG_API_URL = "https://app.posthog.com";
const POSTHOG_KEY = process.env.POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_API_URL;

// PostHog recommends keeping batches under ~1000 events
const POSTHOG_BATCH_SIZE = 500;

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

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/** Batch identify multiple users in PostHog using the /batch endpoint */
export async function batchIdentifyUsers(users: IdentifyUserParams[]): Promise<{
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

  const chunks = chunkArray(users, POSTHOG_BATCH_SIZE);
  let totalSuccessCount = 0;
  let totalFailureCount = 0;
  const errors: string[] = [];

  for (const chunk of chunks) {
    try {
      const batch = chunk.map((user) => ({
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

      totalSuccessCount += chunk.length;
    } catch (error) {
      console.error("Error batch identifying users in PostHog:", error);
      totalFailureCount += chunk.length;
      errors.push(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  return {
    success: totalFailureCount === 0,
    successCount: totalSuccessCount,
    failureCount: totalFailureCount,
    ...(errors.length > 0 && { error: errors.join("; ") }),
  };
}
