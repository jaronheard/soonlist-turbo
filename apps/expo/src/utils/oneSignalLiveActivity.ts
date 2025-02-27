import { Platform } from "react-native";
import { OneSignal } from "react-native-onesignal";
import Constants from "expo-constants";

// Get the API URL from environment variables or Constants
const API_BASE_URL =
  (Constants.expoConfig?.extra?.apiBaseUrl as string) ||
  "https://your-api-url.com";

/**
 * Sets up the OneSignal Live Activity integration
 * This should be called once at app startup
 */
export function setupOneSignalLiveActivity() {
  if (Platform.OS === "ios") {
    try {
      OneSignal.LiveActivities.setupDefault();
      return true;
    } catch (error) {
      console.error("Failed to setup OneSignal Live Activities:", error);
      return false;
    }
  }
  return false;
}

/**
 * Start a Live Activity with OneSignal
 *
 * @param activityId - Unique identifier for the Live Activity
 * @param attributes - Attributes for the Live Activity (will be shown in the widget)
 * @param content - Content for push notifications related to the Live Activity
 * @returns boolean indicating success or failure
 */
export function startOneSignalLiveActivity(
  activityId: string,
  attributes: Record<string, string | number | boolean>,
  content: { message: Record<string, string> },
): boolean {
  if (Platform.OS === "ios") {
    try {
      // Use the SDK method for starting the activity locally
      OneSignal.LiveActivities.startDefault(activityId, attributes, content);
      return true;
    } catch (error) {
      console.error("Failed to start OneSignal Live Activity:", error);
      return false;
    }
  }
  return false;
}

/**
 * Updates an existing Live Activity using our secure backend API
 *
 * @param activityId - The ID of the Live Activity to update
 * @param content - New content for the Live Activity
 * @returns Promise<boolean> indicating success or failure
 */
export async function updateOneSignalLiveActivity(
  activityId: string,
  content: { message: Record<string, string> },
): Promise<boolean> {
  if (Platform.OS !== "ios") return false;

  try {
    // Call our secure backend API
    const response = await fetch(`${API_BASE_URL}/api/live-activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update",
        activityId,
        content,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as Record<string, unknown>;
      console.error("Live Activity update API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to update OneSignal Live Activity:", error);
    return false;
  }
}

/**
 * Ends an existing Live Activity using our secure backend API
 *
 * @param activityId - The ID of the Live Activity to end
 * @returns Promise<boolean> indicating success or failure
 */
export async function endOneSignalLiveActivity(
  activityId: string,
): Promise<boolean> {
  if (Platform.OS !== "ios") return false;

  try {
    // Call our secure backend API
    const response = await fetch(`${API_BASE_URL}/api/live-activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "end",
        activityId,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as Record<string, unknown>;
      console.error("Live Activity end API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to end OneSignal Live Activity:", error);
    return false;
  }
}
