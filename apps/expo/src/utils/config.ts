import Constants from "expo-constants";
import * as Updates from "expo-updates";

// https://docs.expo.dev/eas-update/environment-variables/#setting-a-custom-local-environment

interface Config {
  env: "development" | "production";
  apiBaseUrl: string;
  clerkPublishableKey: string;
  posthogApiKey: string;
}

const Config: Config = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  env: Constants.expoConfig?.extra?.eas?.projectId
    ? Updates.channel === "production"
      ? "production"
      : "development"
    : process.env.NODE_ENV === "production"
      ? "production"
      : "development",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "",
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY || "",
};

export default Config;
