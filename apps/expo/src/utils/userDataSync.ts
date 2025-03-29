import { Platform } from "react-native";
import Intercom from "@intercom/intercom-react-native";
import { OneSignal } from "react-native-onesignal";
import { PostHog } from "posthog-react-native";
import * as Sentry from "@sentry/react-native";

import { logError, logMessage } from "./errorLogging";

export interface UserData {
  userId: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  // Add any other user properties you want to track
  createdAt?: string | null;
  lastActive?: string | null;
  subscriptionStatus?: string | null;
  plan?: string | null;
  // Custom properties
  [key: string]: unknown;
}

/**
 * Synchronizes user data across Intercom, OneSignal, and PostHog
 * @param userData User data to synchronize
 * @param posthog PostHog instance (optional - if not provided, only Intercom and OneSignal will be updated)
 */
export async function syncUserData(userData: UserData, posthog?: PostHog): Promise<void> {
  try {
    const { userId, email, name, username, ...customProperties } = userData;

    // Validate required fields
    if (!userId) {
      logError("User ID is required for user data sync", new Error("Missing userId"));
      return;
    }

    // 1. Sync with Intercom
    await syncIntercomData(userData);

    // 2. Sync with OneSignal
    syncOneSignalData(userData);

    // 3. Sync with PostHog (if instance provided)
    if (posthog) {
      syncPostHogData(userData, posthog);
    }

    // 4. Sync with Sentry (for error reporting)
    Sentry.setUser({
      id: userId,
      email: email || undefined,
      username: username || undefined,
    });

    logMessage("User data synchronized successfully", { userId });
  } catch (error) {
    logError("Failed to sync user data", error, { userId: userData.userId });
  }
}

/**
 * Synchronizes user data with Intercom
 */
async function syncIntercomData(userData: UserData): Promise<void> {
  try {
    const { userId, email, name, username, ...customProperties } = userData;

    // For identified users (with email)
    if (email) {
      await Intercom.loginUserWithUserAttributes({
        userId,
        email,
        name: name || username || "",
        // Add custom attributes
        ...prepareCustomAttributes(customProperties),
      });
      logMessage("Intercom user data synced (identified user)", { userId });
    } else {
      // For unidentified users (no email)
      await Intercom.loginUnidentifiedUser();
      
      // Set available attributes
      if (userId) {
        await Intercom.updateUser({
          userId,
          // Add custom attributes
          ...prepareCustomAttributes(customProperties),
        });
      }
      logMessage("Intercom user data synced (unidentified user)", { userId });
    }
  } catch (error) {
    logError("Failed to sync Intercom user data", error, { userId: userData.userId });
  }
}

/**
 * Synchronizes user data with OneSignal
 */
function syncOneSignalData(userData: UserData): void {
  try {
    const { userId, email, name, username, ...customProperties } = userData;

    // Login with external user ID
    OneSignal.login(userId);

    // Set user tags/attributes
    const tags: Record<string, string> = {
      userId,
      platform: Platform.OS,
    };

    // Add optional fields if available
    if (email) tags.email = email;
    if (username) tags.username = username;
    if (name) tags.name = name;

    // Add custom properties as tags
    Object.entries(customProperties).forEach(([key, value]) => {
      // OneSignal tags must be strings
      if (value !== null && value !== undefined) {
        tags[key] = String(value);
      }
    });

    // Set all tags at once
    OneSignal.User.addTags(tags);
    
    logMessage("OneSignal user data synced", { userId });
  } catch (error) {
    logError("Failed to sync OneSignal user data", error, { userId: userData.userId });
  }
}

/**
 * Synchronizes user data with PostHog
 */
function syncPostHogData(userData: UserData, posthog: PostHog): void {
  try {
    const { userId, email, name, username, ...customProperties } = userData;

    // Identify the user
    posthog.identify(userId, {
      email: email || undefined,
      name: name || undefined,
      username: username || undefined,
      // Add all custom properties
      ...customProperties,
    });
    
    logMessage("PostHog user data synced", { userId });
  } catch (error) {
    logError("Failed to sync PostHog user data", error, { userId: userData.userId });
  }
}

/**
 * Reset user data across all services (for logout)
 */
export async function resetUserData(posthog?: PostHog): Promise<void> {
  try {
    // Reset Intercom
    await Intercom.logout();
    
    // Reset OneSignal
    OneSignal.logout();
    
    // Reset PostHog
    if (posthog) {
      posthog.reset();
    }
    
    // Reset Sentry
    Sentry.setUser(null);
    
    logMessage("User data reset across all services");
  } catch (error) {
    logError("Failed to reset user data", error);
  }
}

/**
 * Helper function to prepare custom attributes for Intercom
 * Intercom has specific requirements for attribute formats
 */
function prepareCustomAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
  const prepared: Record<string, unknown> = {};
  
  Object.entries(attributes).forEach(([key, value]) => {
    // Handle dates - Intercom expects ISO strings
    if (value instanceof Date) {
      prepared[key] = value.toISOString();
    } else {
      prepared[key] = value;
    }
  });
  
  return prepared;
}