import Constants from "expo-constants";
import * as Updates from "expo-updates";

// https://docs.expo.dev/eas-update/environment-variables/#setting-a-custom-local-environment

interface Config {
  env: "development" | "production";
  apiBaseUrl: string;
  clerkPublishableKey: string;
  posthogApiKey: string;
}

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL as string;
const clerkPublishableKey = process.env
  .EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;
const posthogApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY as string;

if (!apiBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is required");
}

if (!clerkPublishableKey) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required");
}

if (!posthogApiKey) {
  throw new Error("EXPO_PUBLIC_POSTHOG_API_KEY is required");
}

const Config: Config = {
  env: (Constants.expoConfig as { extra?: { eas?: { projectId?: string } } })
    .extra?.eas?.projectId
    ? (Updates.channel ?? "development") === "production"
      ? "production"
      : "development"
    : process.env.NODE_ENV === "production"
      ? "production"
      : "development",
  apiBaseUrl,
  clerkPublishableKey,
  posthogApiKey,
};

export default Config;
