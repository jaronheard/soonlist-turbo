import { Platform } from "react-native";
import { OneSignal } from "react-native-onesignal";

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
 * Updates an existing Live Activity
 * Note: If updateDefault is not available, it falls back to startDefault which
 * can also update existing activities
 *
 * @param activityId - The ID of the Live Activity to update
 * @param content - New content for the Live Activity
 * @returns boolean indicating success or failure
 */
export function updateOneSignalLiveActivity(
  activityId: string,
  content: { message: Record<string, string> },
): boolean {
  if (Platform.OS === "ios") {
    try {
      // Try to use startDefault to update (it will update if the activity exists)
      OneSignal.LiveActivities.startDefault(activityId, {}, content);
      return true;
    } catch (error) {
      console.error("Failed to update OneSignal Live Activity:", error);
      return false;
    }
  }
  return false;
}

/**
 * Ends an existing Live Activity
 * Note: If endDefault is not available in the API, you may need to
 * implement a custom mechanism to end activities
 *
 * @param activityId - The ID of the Live Activity to end
 * @returns boolean indicating success or failure
 */
export function endOneSignalLiveActivity(_activityId: string): boolean {
  if (Platform.OS === "ios") {
    try {
      // There's no direct endDefault method in OneSignal's public API
      // To end an activity, you may need to implement a custom solution
      // or check OneSignal's documentation for the latest API
      console.warn(
        "endOneSignalLiveActivity: Direct method not available in API. Consider updating this implementation.",
      );
      return false;
    } catch (error) {
      console.error("Failed to end OneSignal Live Activity:", error);
      return false;
    }
  }
  return false;
}
